import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveApexAssistantShellState,
  resolveApexAssistantCommand,
  resolveAssistantDailyOpsBriefCommand,
  resolveAssistantNextBestActionsCommand,
  resolveAssistantWorkflowDraftPrepCommand,
  resolveAssistantChangeOrderReviewCommand,
  resolveAssistantCrewReadinessCommand,
  resolveAssistantCustomerAccountCommand,
  resolveAssistantDailyCloseoutReadinessCommand,
  resolveAssistantDeliveryTicketReviewCommand,
  resolveAssistantEstimateDraftCommand,
  resolveAssistantEstimateJobHandoffCommand,
  resolveAssistantEstimatePacketCommand,
  resolveAssistantImportedDraftReviewCommand,
  resolveAssistantJobHandoffCommand,
  resolveAssistantLeadFollowUpCommand,
  resolveAssistantMaterialPlanningCommand,
  resolveAssistantMissingProofCommand,
  resolveAssistantOperatorCommand,
  resolveAssistantPilotHandoffReadinessCommand,
  resolveAssistantPostPourReviewCommand,
  resolveAssistantPrePourReviewCommand,
  resolveAssistantReportReviewCommand,
  resolveAssistantReleaseReadinessCommand,
  resolveAssistantSafetyIncidentReviewCommand,
  resolveAssistantScheduleDispatchCommand,
  resolveAssistantSupportWorkflowCommand,
  resolveAssistantTimeReviewCommand,
  resolveAssistantToolChecklistReviewCommand,
  resolveAssistantUploadReviewCommand,
  resolveAssistantWorkflowContextCommand,
} from "./apex-assistant-shell-utils.js";

test("assistant shell is hidden without AI Office permission", () => {
  const state = deriveApexAssistantShellState({
    permissions: { aiOffice: { canView: false }, jobs: { canManageAll: false }, leads: { canView: false } },
    commandCenter: {
      watchtowerQueue: [{ id: "report:1", title: "Report", moduleId: "reports" }],
      watchtowerActions: [{ id: "proof", title: "Proof", moduleId: "uploads" }],
    },
  });

  assert.equal(state.canView, false);
  assert.deepEqual(state.watchtowerQueue, []);
  assert.deepEqual(state.watchtowerActions, []);
});

test("assistant shell stays hidden when the package does not include AI Office", () => {
  const state = deriveApexAssistantShellState({
    permissions: { aiOffice: { canView: false }, jobs: { canManageAll: true }, leads: { canView: true } },
    commandCenter: {
      watchtowerQueue: [{ id: "job:1", title: "Job startup", moduleId: "jobs" }],
    },
  });

  assert.equal(state.canView, false);
  assert.equal(state.watchtowerQueue.length, 0);
});

test("assistant shell summarizes watchtower context for permitted office users", () => {
  const state = deriveApexAssistantShellState({
    permissions: { aiOffice: { canView: true } },
    commandCenter: {
      stats: { fieldProofGaps: 2, reviewQueueItems: 1 },
      watchtowerQueue: [
        { id: "report:1", title: "Daily report", moduleId: "reports" },
        { id: "photo:1", title: "Missing photo", moduleId: "uploads" },
      ],
      watchtowerActions: [{ id: "proof", title: "Close proof gaps", moduleId: "reports" }],
    },
  });

  assert.equal(state.canView, true);
  assert.equal(state.modeLabel, "Review-only");
  assert.equal(state.statusLabel, "2 need attention");
  assert.equal(state.watchtowerQueue.length, 2);
  assert.equal(state.watchtowerActions[0].moduleId, "reports");
});

test("assistant commands route to existing modules without write actions", () => {
  const reportCommand = resolveApexAssistantCommand("open reports needing review");
  const estimateCommand = resolveApexAssistantCommand("open estimates and proposals");
  const fallbackCommand = resolveApexAssistantCommand("send the customer a message");

  assert.equal(reportCommand.moduleId, "reports");
  assert.equal(reportCommand.actionLabel, "Open reports");
  assert.equal(estimateCommand.moduleId, "estimates");
  assert.equal(fallbackCommand.moduleId, "commandCenter");
  assert.match(fallbackCommand.message, /will not send customer messages automatically/i);
});

test("assistant routes newly finished manual-safe workflows without execution", () => {
  const communicationsCommand = resolveApexAssistantCommand("review customer portal share approval");
  const billingCommand = resolveApexAssistantCommand("open billing prep for ready to bill jobs");
  const reputationCommand = resolveApexAssistantCommand("review reputation project story and referral ask");
  const actionInboxCommand = resolveApexAssistantCommand("open Agent OS action inbox external gate review packets");

  assert.equal(communicationsCommand.moduleId, "communications");
  assert.match(communicationsCommand.message, /No email, SMS, portal link, token, or customer action/i);
  assert.equal(billingCommand.moduleId, "settings");
  assert.match(billingCommand.message, /No invoice, payment link, charge, receipt/i);
  assert.equal(reputationCommand.moduleId, "copilot");
  assert.match(reputationCommand.message, /Nothing is sent, published, invented, or approved/i);
  assert.equal(actionInboxCommand.moduleId, "copilot");
  assert.match(actionInboxCommand.message, /cannot execute provider actions automatically/i);
});

test("assistant explicitly blocks risky money payroll portal provider and scheduling asks", () => {
  const invoiceCommand = resolveApexAssistantCommand("create an invoice and payment link for JOB-1");
  const payrollCommand = resolveApexAssistantCommand("process payroll and run direct deposit");
  const portalCommand = resolveApexAssistantCommand("generate a customer portal token");
  const providerCommand = resolveApexAssistantCommand("sync this to QuickBooks");
  const scheduleCommand = resolveApexAssistantCommand("schedule the job for tomorrow");

  assert.equal(invoiceCommand.type, "blocked-command");
  assert.match(invoiceCommand.message, /will not create invoices, payment links/i);
  assert.equal(payrollCommand.type, "blocked-command");
  assert.match(payrollCommand.message, /will not process payroll/i);
  assert.equal(portalCommand.type, "blocked-command");
  assert.match(portalCommand.message, /will not create, generate, send, share, or redeem customer portal/i);
  assert.equal(providerCommand.type, "blocked-command");
  assert.match(providerCommand.message, /will not write to providers/i);
  assert.equal(scheduleCommand.type, "blocked-command");
  assert.match(scheduleCommand.message, /will not schedule or reschedule work automatically/i);
});

test("broad contractor business questions fall through to the advisor path", () => {
  const moneyQuestion = resolveApexAssistantCommand("Where am I losing money?");
  const marketingQuestion = resolveApexAssistantCommand("How do we market better?");

  assert.equal(moneyQuestion.type, "safe-fallback");
  assert.equal(marketingQuestion.type, "safe-fallback");
  assert.notEqual(moneyQuestion.moduleId, "schedule");
});

test("assistant summarizes workflow context without mutating records", () => {
  const command = resolveAssistantWorkflowContextCommand("what should we do next", {
    permissions: {
      leads: { canView: true },
      estimates: { canView: true },
      jobs: { canView: true },
      reports: { canView: true },
      uploads: { canView: true },
      customers: { canView: true },
    },
    leads: [{ id: "LEAD-1", customer: "Friendly Fence", status: "Follow Up" }],
    estimates: [{ id: "EST-1", title: "Fence Estimate", status: "Draft" }],
    jobs: [{ id: "JOB-1", title: "Fence Install", status: "Scheduled" }],
    dailyReports: [{ id: "DR-1", title: "Daily", status: "Submitted" }],
    uploads: [{ id: "UP-1", title: "Photos", status: "Needs Review" }],
    customers: [{ id: "CUS-1", name: "Friendly Fence", status: "Active" }],
  });

  assert.equal(command.type, "workflow-context-summary");
  assert.ok(command.workflowContext.attentionCount > 0);
  assert.match(command.message, /review-first/i);
  assert.match(command.workflowContext.safetyBoundary, /No customer contact/i);
  assert.equal(command.actions.some((action) => action.moduleId === "reports"), true);
});

test("assistant returns ranked next best actions without mutation controls", () => {
  const command = resolveAssistantNextBestActionsCommand("show next best actions", {
    permissions: {
      leads: { canView: true },
      estimates: { canView: true },
      jobs: { canView: true },
      reports: { canView: true },
      uploads: { canView: true },
      safety: { canView: true },
    },
    leads: [{ id: "LEAD-1", customer: "Friendly Fence", status: "Follow Up" }],
    estimates: [{ id: "EST-1", title: "Fence Estimate", status: "Draft" }],
    jobs: [{ id: "JOB-1", title: "Fence Install", status: "Scheduled" }],
    dailyReports: [{ id: "DR-1", title: "Daily", status: "Submitted" }],
    uploads: [{ id: "UP-1", title: "Photos", status: "Needs Review" }],
    safetyIncidents: [{ id: "SAFE-1", title: "Open hazard", status: "Open" }],
  });

  assert.equal(command.type, "next-best-actions");
  assert.equal(command.nextActions.mode, "review_first_next_actions");
  assert.ok(command.nextActions.actions.length > 0);
  assert.match(command.nextActions.safetyBoundary, /No customer contact/i);
  assert.match(command.nextActions.actions[0].blockedAutomation, /automatically/i);
});

test("assistant command routes explicit next best action prompts to ranked actions", () => {
  const command = resolveApexAssistantCommand("what should we do now", {
    commandContext: {
      permissions: {
        jobs: { canView: true },
        reports: { canView: true },
      },
      jobs: [{ id: "JOB-1", title: "Assigned Fence", status: "Scheduled" }],
      dailyReports: [{ id: "DR-1", title: "Daily", status: "Submitted" }],
    },
  });

  assert.equal(command.type, "next-best-actions");
  assert.equal(command.actions.some((action) => action.moduleId === "reports"), true);
});

test("assistant prepares workflow draft packet without saving or sending", () => {
  const command = resolveAssistantWorkflowDraftPrepCommand("prepare next action draft packet", {
    permissions: {
      reports: { canView: true },
      uploads: { canView: true },
    },
    dailyReports: [{ id: "DR-1", title: "Daily", status: "Submitted" }],
    uploads: [{ id: "UP-1", title: "Photos", status: "Needs Review" }],
  });

  assert.equal(command.type, "workflow-draft-prep");
  assert.equal(command.moduleId, "reports");
  assert.match(command.message, /Nothing is saved/i);
  assert.ok(command.draftPacket.blockedActions.some((item) => /No customer email/i.test(item)));
});

test("assistant command routes draft packet prompts before next-action listing", () => {
  const command = resolveApexAssistantCommand("build next action review packet", {
    commandContext: {
      permissions: {
        reports: { canView: true },
      },
      dailyReports: [{ id: "DR-1", title: "Daily", status: "Submitted" }],
    },
  });

  assert.equal(command.type, "workflow-draft-prep");
  assert.equal(command.actionLabel, "Open reports");
});

test("assistant returns a daily operations brief without write behavior", () => {
  const command = resolveAssistantDailyOpsBriefCommand("daily operations brief", {
    permissions: {
      leads: { canView: true },
      jobs: { canView: true },
      reports: { canView: true },
      uploads: { canView: true },
    },
    leads: [{ id: "LEAD-1", customer: "Friendly Fence", status: "Follow Up" }],
    jobs: [{ id: "JOB-1", title: "Fence Install", status: "Scheduled" }],
    dailyReports: [{ id: "DR-1", title: "Daily", status: "Submitted" }],
    uploads: [{ id: "UP-1", title: "Photos", status: "Needs Review" }],
  });

  assert.equal(command.type, "daily-ops-brief");
  assert.ok(command.brief.metrics.length > 0);
  assert.match(command.message, /Brief only/i);
  assert.ok(command.actions.length > 0);
});

test("assistant command routes daily ops brief prompts before generic status", () => {
  const command = resolveApexAssistantCommand("give me the daily ops brief", {
    commandContext: {
      permissions: {
        jobs: { canView: true },
      },
      jobs: [{ id: "JOB-1", title: "Assigned Fence", status: "Scheduled" }],
    },
  });

  assert.equal(command.type, "daily-ops-brief");
});

test("empty assistant command starts with highest watchtower action", () => {
  const command = resolveApexAssistantCommand("", {
    watchtowerActions: [
      {
        title: "Unblock job startup",
        description: "Jobs need crew assignment.",
        moduleId: "jobs",
        actionLabel: "Open jobs",
      },
    ],
  });

  assert.equal(command.type, "watchtower");
  assert.equal(command.moduleId, "jobs");
  assert.match(command.message, /Unblock job startup/);
});

test("assistant summarizes missing proof for a visible office job", () => {
  const command = resolveAssistantMissingProofCommand("Summarize missing proof for Westview Warehouse", {
    permissions: {
      jobs: { canManageAll: true, canView: true },
      reports: { canManageAll: true, canReview: true },
      uploads: { canManageAll: true },
      deliveryTickets: { canManageAll: true },
    },
    jobs: [{ id: "JOB-1", title: "Westview Warehouse" }],
    commandCenter: {
      dailyReports: {
        activeJobsMissingTodayReport: [{ id: "JOB-1", title: "Westview Warehouse" }],
        dailyReportsNeedingReview: [],
      },
      uploads: { jobsMissingPhotos: [{ id: "JOB-1", title: "Westview Warehouse" }] },
      fieldRecords: {
        pendingDeliveryTickets: [{ id: "TICKET-1", jobId: "JOB-1", status: "pending" }],
        pendingPrePour: [],
        pendingPostPour: [],
        openSafetyIncidents: [],
        openToolChecklists: [],
      },
    },
  });

  assert.equal(command.type, "missing-proof-summary");
  assert.equal(command.job.title, "Westview Warehouse");
  assert.match(command.message, /3 proof items?/i);
  assert.equal(command.items.find((item) => item.id === "daily-report").status, "missing");
  assert.equal(command.items.find((item) => item.id === "photo-proof").status, "missing");
  assert.equal(command.items.find((item) => item.id === "delivery-tickets").status, "needs-review");
  assert.deepEqual(command.actions.map((action) => action.moduleId), ["reports", "uploads", "deliveryTickets"]);
});

test("assistant missing proof summary stays clear when current proof data is complete", () => {
  const command = resolveAssistantMissingProofCommand("what proof is missing", {
    permissions: { jobs: { canManageAll: true, canView: true } },
    jobs: [{ id: "JOB-2", title: "Clean Job" }],
    commandCenter: {
      dailyReports: { activeJobsMissingTodayReport: [], dailyReportsNeedingReview: [] },
      uploads: { jobsMissingPhotos: [] },
      fieldRecords: {
        pendingDeliveryTickets: [],
        pendingPrePour: [],
        pendingPostPour: [],
        openSafetyIncidents: [],
        openToolChecklists: [],
      },
    },
  });

  assert.equal(command.type, "missing-proof-summary");
  assert.match(command.message, /does not show missing proof/i);
  assert.equal(command.items.every((item) => item.status === "complete"), true);
});

test("assistant missing proof summary is blocked for field roles", () => {
  const command = resolveAssistantMissingProofCommand("show missing photos", {
    permissions: {
      jobs: { canView: true, canManageField: true, canManageAll: false },
      reports: { canCreate: true, canManageAll: false },
      uploads: { canCreate: true, canManageAll: false },
    },
    jobs: [{ id: "JOB-3", title: "Field Job" }],
  });

  assert.equal(command.type, "blocked-command");
  assert.match(command.message, /Field users stay limited/i);
});

test("assistant opens daily closeout readiness without approving or billing", () => {
  const command = resolveAssistantDailyCloseoutReadinessCommand("Review daily closeout and ready-to-bill proof chain", {
    permissions: {
      jobs: { canView: true, canManageAll: true },
      reports: { canView: true, canReview: true },
      uploads: { canView: true, canManageAll: true },
      deliveryTickets: { canView: true, canManageAll: true },
      prePour: { canReview: true },
      postPour: { canReview: true },
      safety: { canReviewIncidents: true },
      time: { canView: true, canManageAll: true },
    },
    jobs: [
      { id: "JOB-1", title: "Westview Warehouse", status: "billing_ready" },
      { id: "JOB-2", title: "Maple Ridge", status: "in_progress" },
    ],
    estimates: [{ id: "EST-1", jobId: "JOB-1", grandTotal: 48750 }],
    dailyReports: [
      { id: "REPORT-1", status: "submitted", jobId: "JOB-1" },
      { id: "REPORT-2", status: "reviewed", jobId: "JOB-2" },
    ],
    uploads: [{ id: "UPLOAD-1", jobId: "JOB-1", fileName: "finish.jpg" }],
    deliveryTickets: [{ id: "TICKET-1", jobId: "JOB-1", status: "pending" }],
    changeOrderRequests: [{ id: "CO-1", jobId: "JOB-1", status: "approved_for_pricing", amount: 750 }],
    prePourChecklists: [{ id: "PRE-1", status: "completed" }],
    postPourChecklists: [{ id: "POST-1", status: "reopened" }],
    safetyIncidents: [{ id: "SAFE-1", status: "open" }],
    timeEntries: [{ id: "TIME-1", jobId: "JOB-1", status: "active", clockInAt: "2026-05-22T07:00:00Z", clockOutAt: "" }],
    commandCenter: {
      stats: { missingReports: 1, fieldProofGaps: 2 },
      uploads: { jobsMissingPhotos: [{ id: "JOB-2" }] },
    },
  });

  assert.equal(command.type, "daily-closeout-readiness");
  assert.equal(command.moduleId, "reports");
  assert.equal(command.actions.map((action) => action.moduleId).join(","), "reports,uploads,jobs,time,deliveryTickets");
  assert.equal(command.closeoutSummary.length, 9);
  assert.equal(command.closeoutSummary.some((item) => /Profit\/loss review prep/i.test(item.label)), true);
  assert.equal(command.closeoutSummary.some((item) => /Job costing review/i.test(item.label)), true);
  assert.equal(command.closeoutSummary.some((item) => /Manual invoice \/ payment prep/i.test(item.label)), true);
  assert.equal(command.closeoutSummary.some((item) => /Approved changes \/ missing proof/i.test(item.label)), true);
  assert.equal(command.closeoutSummary.some((item) => /Billing review candidates/i.test(item.label)), true);
  assert.equal(command.closeoutSummary.some((item) => /does not create invoices, collect payment, send customer messages/i.test(item.detail)), true);
  assert.equal(command.billingReviewPacket.metrics.estimateTotal, 48750);
  assert.equal(command.billingReviewPacket.metrics.changeOrdersNeedingReview, 1);
  assert.equal(command.billingReviewPacket.blockedActions.some((item) => /No invoice is created/i.test(item)), true);
  assert.match(command.message, /No report approval, upload change, ticket link, checklist review, time correction, safety resolution, billing action, invoice/i);
});

test("assistant daily closeout readiness is blocked for field users", () => {
  const command = resolveAssistantDailyCloseoutReadinessCommand("Review daily closeout and ready-to-bill proof chain", {
    permissions: {
      jobs: { canView: true, canManageField: true, canManageAll: false },
      reports: { canCreate: true, canReview: false },
      uploads: { canCreate: true, canManageAll: false },
      time: { canClockSelf: true, canManageAll: false },
    },
    jobs: [{ id: "JOB-1", title: "Assigned Field Job" }],
  });

  assert.equal(command.type, "blocked-command");
  assert.match(command.message, /Field users stay limited/i);
});

test("assistant routes daily closeout before generic reports navigation", () => {
  const command = resolveApexAssistantCommand("Open reports and review daily closeout proof chain", {
    commandContext: {
      permissions: {
        jobs: { canView: true, canManageAll: true },
        reports: { canView: true, canReview: true },
        uploads: { canView: true, canManageAll: true },
      },
      dailyReports: [{ id: "REPORT-1", status: "submitted" }],
    },
  });

  assert.equal(command.type, "daily-closeout-readiness");
  assert.equal(command.moduleId, "reports");
});

test("assistant opens job startup handoff for visible office jobs without write actions", () => {
  const command = resolveAssistantJobHandoffCommand("Prepare foreman handoff for Westview Warehouse", {
    permissions: { jobs: { canManageAll: true } },
    jobs: [
      {
        id: "JOB-1",
        title: "Westview Warehouse",
        customer: "ABC Builders",
        startupStatus: "Needs Review",
        scheduledStart: "",
      },
    ],
  });

  assert.equal(command.type, "job-handoff-review");
  assert.equal(command.matches.length, 1);
  assert.equal(command.matches[0].jobId, "JOB-1");
  assert.match(command.message, /No schedule, crew assignment, field visibility, or customer message/i);
});

test("assistant job startup handoff is blocked for field roles", () => {
  const command = resolveAssistantJobHandoffCommand("Open startup checklist for Westview Warehouse", {
    permissions: { jobs: { canManageAll: false, canManageField: true } },
    jobs: [{ id: "JOB-1", title: "Westview Warehouse" }],
  });

  assert.equal(command.type, "blocked-command");
  assert.match(command.message, /Field users stay limited/i);
});

test("assistant opens submitted daily report review without write actions", () => {
  const command = resolveAssistantReportReviewCommand("Review submitted report for Westview Warehouse", {
    permissions: { reports: { canReview: true, canManageAll: true } },
    dailyReports: [
      {
        id: "REPORT-1",
        status: "submitted",
        reportDate: "2026-05-20",
        createdByName: "Luis G.",
        workPerformed: "Formed sidewalk",
        crewSummary: "3 crew",
        weather: "Clear",
        job: { id: "JOB-1", title: "Westview Warehouse", customer: "ABC Builders" },
      },
    ],
  });

  assert.equal(command.type, "report-review");
  assert.equal(command.matches.length, 1);
  assert.equal(command.matches[0].reportId, "REPORT-1");
  assert.match(command.message, /No report will be approved, reopened, archived, printed, or changed automatically/i);
});

test("assistant daily report review is blocked for field roles", () => {
  const command = resolveAssistantReportReviewCommand("Open reports needing review", {
    permissions: { reports: { canCreate: true, canReview: false, canManageAll: false } },
    dailyReports: [{ id: "REPORT-1", status: "submitted", job: { title: "Field Job" } }],
  });

  assert.equal(command.type, "blocked-command");
  assert.match(command.message, /Field users can create assigned job reports/i);
});

test("assistant routes submitted report review before generic report navigation", () => {
  const command = resolveApexAssistantCommand("Open submitted reports needing review for Westview Warehouse", {
    commandContext: {
      permissions: { reports: { canReview: true, canManageAll: true } },
      dailyReports: [
        { id: "REPORT-1", status: "submitted", reportDate: "2026-05-20", job: { title: "Westview Warehouse" } },
      ],
    },
  });

  assert.equal(command.type, "report-review");
  assert.equal(command.matches[0].reportId, "REPORT-1");
});

test("assistant opens upload proof review without write actions", () => {
  const command = resolveAssistantUploadReviewCommand("Review photo proof for Westview Warehouse", {
    permissions: { uploads: { canView: true, canManageAll: true } },
    uploads: [
      {
        id: "UPLOAD-1",
        fileName: "westview-pour.jpg",
        caption: "",
        fileType: "image/jpeg",
        uploadedByName: "Luis G.",
        latitude: null,
        longitude: null,
        job: { id: "JOB-1", title: "Westview Warehouse", customer: "ABC Builders" },
      },
    ],
  });

  assert.equal(command.type, "upload-review");
  assert.equal(command.matches.length, 1);
  assert.equal(command.matches[0].uploadId, "UPLOAD-1");
  assert.match(command.message, /No upload will be edited, archived, linked, approved, billed, sent, or changed automatically/i);
});

test("assistant upload proof review is blocked for field roles", () => {
  const command = resolveAssistantUploadReviewCommand("Open upload proof review for Westview Warehouse", {
    permissions: { uploads: { canView: true, canCreate: true, canManageAll: false } },
    uploads: [{ id: "UPLOAD-1", fileName: "field-photo.jpg", job: { title: "Field Job" } }],
  });

  assert.equal(command.type, "blocked-command");
  assert.match(command.message, /Field users can capture assigned job photos/i);
});

test("assistant routes upload proof review before generic upload navigation", () => {
  const command = resolveApexAssistantCommand("Open upload proof review for Westview Warehouse", {
    commandContext: {
      permissions: { uploads: { canView: true, canManageAll: true } },
      uploads: [
        { id: "UPLOAD-1", fileName: "westview-pour.jpg", job: { title: "Westview Warehouse" } },
      ],
    },
  });

  assert.equal(command.type, "upload-review");
  assert.equal(command.matches[0].uploadId, "UPLOAD-1");
});

test("assistant keeps generic uploads navigation out of office proof review", () => {
  const command = resolveApexAssistantCommand("open uploads", {
    commandContext: {
      permissions: { uploads: { canView: true, canManageAll: true } },
      uploads: [
        { id: "UPLOAD-1", fileName: "westview-pour.jpg", job: { title: "Westview Warehouse" } },
      ],
    },
  });

  assert.equal(command.type, "route");
  assert.equal(command.moduleId, "uploads");
});

test("assistant opens time review without write actions", () => {
  const command = resolveAssistantTimeReviewCommand("Review active clock for Luis on Westview Warehouse", {
    permissions: { time: { canViewAll: true, canCorrect: true } },
    timeEntries: [
      {
        id: "TIME-1",
        status: "active",
        userName: "Luis G.",
        userRole: "Foreman",
        clockInAt: "2026-05-20T07:00:00.000Z",
        job: { id: "JOB-1", title: "Westview Warehouse", customer: "ABC Builders" },
      },
    ],
  });

  assert.equal(command.type, "time-review");
  assert.equal(command.matches.length, 1);
  assert.equal(command.matches[0].timeEntryId, "TIME-1");
  assert.match(command.message, /No time entry will be corrected, clocked out, break-adjusted, approved, exported, or changed automatically/i);
});

test("assistant time review is blocked for field roles", () => {
  const command = resolveAssistantTimeReviewCommand("Open active clock review", {
    permissions: { time: { canView: true, canManageOwn: true, canViewAll: false, canCorrect: false } },
    timeEntries: [{ id: "TIME-1", status: "active", userName: "Field User" }],
  });

  assert.equal(command.type, "blocked-command");
  assert.match(command.message, /Field users stay limited/i);
});

test("assistant routes time review before generic time navigation", () => {
  const command = resolveApexAssistantCommand("Open active clock review for Westview Warehouse", {
    commandContext: {
      permissions: { time: { canViewAll: true, canCorrect: true } },
      timeEntries: [
        { id: "TIME-1", status: "active", userName: "Luis G.", job: { title: "Westview Warehouse" } },
      ],
    },
  });

  assert.equal(command.type, "time-review");
  assert.equal(command.matches[0].timeEntryId, "TIME-1");
});

test("assistant routes generic time navigation without office review", () => {
  const command = resolveApexAssistantCommand("open time");

  assert.equal(command.type, "route");
  assert.equal(command.moduleId, "time");
});

test("assistant opens change order review without write actions", () => {
  const command = resolveAssistantChangeOrderReviewCommand("Review change order for Westview Warehouse", {
    permissions: { changeOrders: { canView: true, canManage: true } },
    changeOrderRequests: [
      {
        id: "CO-1",
        status: "requested",
        reason: "Extra curb removal",
        scopeDescription: "Remove and replace added curb section",
        requestedByName: "Luis G.",
        job: { id: "JOB-1", title: "Westview Warehouse", customer: "ABC Builders" },
      },
    ],
  });

  assert.equal(command.type, "change-order-review");
  assert.equal(command.matches.length, 1);
  assert.equal(command.matches[0].changeOrderRequestId, "CO-1");
  assert.match(command.message, /No request will be approved, priced, rejected, archived, sent, billed, or changed automatically/i);
});

test("assistant change order review is blocked for field roles", () => {
  const command = resolveAssistantChangeOrderReviewCommand("Open change orders needing review", {
    permissions: { changeOrders: { canView: true, canRequest: true, canManage: false } },
    changeOrderRequests: [{ id: "CO-1", status: "requested", reason: "Field change", job: { title: "Field Job" } }],
  });

  assert.equal(command.type, "blocked-command");
  assert.match(command.message, /Field users can submit visible job change requests/i);
});

test("assistant routes change order review before generic change order navigation", () => {
  const command = resolveApexAssistantCommand("Open change orders needing review for Westview Warehouse", {
    commandContext: {
      permissions: { changeOrders: { canView: true, canManage: true } },
      changeOrderRequests: [
        { id: "CO-1", status: "requested", reason: "Extra curb removal", job: { title: "Westview Warehouse" } },
      ],
    },
  });

  assert.equal(command.type, "change-order-review");
  assert.equal(command.matches[0].changeOrderRequestId, "CO-1");
});

test("assistant routes generic change orders without office review", () => {
  const command = resolveApexAssistantCommand("open change orders");

  assert.equal(command.type, "route");
  assert.equal(command.moduleId, "changeOrders");
});

test("assistant opens lead follow-up review without write actions", () => {
  const command = resolveAssistantLeadFollowUpCommand("Review lead follow-up for Westview Warehouse", {
    permissions: { leads: { canView: true, canManage: true } },
    leads: [
      {
        id: "LEAD-1",
        customer: "ABC Builders",
        project: "Westview Warehouse",
        city: "Salem",
        status: "Contacted",
        nextStep: "Call GC about slab walkthrough",
        followUpDueAt: "2026-05-20",
      },
    ],
  });

  assert.equal(command.type, "lead-follow-up");
  assert.equal(command.matches.length, 1);
  assert.equal(command.matches[0].leadId, "LEAD-1");
  assert.match(command.message, /No email, text, call, estimate, customer conversion, archive, or status change/i);
});

test("assistant lead follow-up is blocked for field roles", () => {
  const command = resolveAssistantLeadFollowUpCommand("Open lead follow-ups due today", {
    permissions: { leads: { canView: false, canManage: false } },
    leads: [{ id: "LEAD-1", customer: "Hidden Lead", followUpDueAt: "2026-05-20" }],
  });

  assert.equal(command.type, "blocked-command");
  assert.match(command.message, /Field users stay blocked/i);
});

test("assistant routes lead follow-up before generic lead navigation", () => {
  const command = resolveApexAssistantCommand("Open lead follow-up for Westview Warehouse", {
    commandContext: {
      permissions: { leads: { canView: true, canManage: true } },
      leads: [
        { id: "LEAD-1", customer: "ABC Builders", project: "Westview Warehouse", followUpDueAt: "2026-05-20" },
      ],
    },
  });

  assert.equal(command.type, "lead-follow-up");
  assert.equal(command.matches[0].leadId, "LEAD-1");
});

test("assistant keeps generic leads navigation out of follow-up review", () => {
  const command = resolveApexAssistantCommand("open leads");

  assert.equal(command.type, "route");
  assert.equal(command.moduleId, "leads");
});

test("assistant opens customer account review without write actions", () => {
  const command = resolveAssistantCustomerAccountCommand("Review customer account for ABC Builders", {
    permissions: { customers: { canView: true, canManage: true } },
    customers: [
      {
        id: "CUST-1",
        name: "ABC Builders",
        city: "Salem",
        status: "Active",
        email: "ops@abc.test",
        phone: "555-0100",
      },
    ],
  });

  assert.equal(command.type, "customer-account-review");
  assert.equal(command.matches.length, 1);
  assert.equal(command.matches[0].customerId, "CUST-1");
  assert.match(command.message, /No customer record will be edited, archived, converted, messaged, billed, or changed automatically/i);
});

test("assistant customer account review is blocked for field roles", () => {
  const command = resolveAssistantCustomerAccountCommand("Open customer account for ABC Builders", {
    permissions: { customers: { canView: false, canManage: false } },
    customers: [{ id: "CUST-1", name: "ABC Builders" }],
  });

  assert.equal(command.type, "blocked-command");
  assert.match(command.message, /Field users stay blocked/i);
});

test("assistant routes customer account review before generic customer navigation", () => {
  const command = resolveApexAssistantCommand("Open customer account for ABC Builders", {
    commandContext: {
      permissions: { customers: { canView: true, canManage: true } },
      customers: [{ id: "CUST-1", name: "ABC Builders", city: "Salem", status: "Active" }],
    },
  });

  assert.equal(command.type, "customer-account-review");
  assert.equal(command.matches[0].customerId, "CUST-1");
});

test("assistant keeps generic customers navigation out of account review", () => {
  const command = resolveApexAssistantCommand("open customers");

  assert.equal(command.type, "route");
  assert.equal(command.moduleId, "customers");
});

test("assistant opens crew readiness review without write actions", () => {
  const command = resolveAssistantCrewReadinessCommand("Review crew readiness for Luis Garcia", {
    permissions: { users: { canView: true, canManage: true } },
    users: [
      {
        id: "USER-1",
        name: "Luis Garcia",
        role: "Employee",
        status: "active",
        email: "luis@example.test",
        phone: "555-0101",
      },
    ],
  });

  assert.equal(command.type, "crew-readiness-review");
  assert.equal(command.matches.length, 1);
  assert.equal(command.matches[0].userId, "USER-1");
  assert.match(command.message, /No role, invite, job assignment, time entry, safety record, or employee profile will be changed automatically/i);
});

test("assistant crew readiness review is blocked for field roles", () => {
  const command = resolveAssistantCrewReadinessCommand("Open crew readiness for Luis Garcia", {
    permissions: { users: { canView: false, canManage: false } },
    users: [{ id: "USER-1", name: "Luis Garcia", role: "Employee" }],
  });

  assert.equal(command.type, "blocked-command");
  assert.match(command.message, /Field users stay blocked/i);
});

test("assistant routes crew readiness before generic employee navigation", () => {
  const command = resolveApexAssistantCommand("Open crew readiness for Luis Garcia", {
    commandContext: {
      permissions: { users: { canView: true, canManage: true } },
      users: [{ id: "USER-1", name: "Luis Garcia", role: "Employee", status: "active" }],
    },
  });

  assert.equal(command.type, "crew-readiness-review");
  assert.equal(command.matches[0].userId, "USER-1");
});

test("assistant keeps generic employees navigation out of crew readiness review", () => {
  const command = resolveApexAssistantCommand("open employees");

  assert.equal(command.type, "route");
  assert.equal(command.moduleId, "employees");
});

test("assistant opens schedule dispatch review without write actions", () => {
  const command = resolveAssistantScheduleDispatchCommand("Review schedule dispatch for Westview Warehouse", {
    permissions: { jobs: { canView: true, canManageAll: true } },
    jobs: [
      {
        id: "JOB-1",
        title: "Westview Warehouse",
        customer: "ABC Builders",
        city: "Salem",
        status: "scheduled",
        scheduledStart: "2026-05-21T07:00",
        assignedForemanName: "Luis Garcia",
      },
    ],
  });

  assert.equal(command.type, "schedule-dispatch-review");
  assert.equal(command.matches.length, 1);
  assert.equal(command.matches[0].jobId, "JOB-1");
  assert.match(command.message, /No crew, date, time, job status, field visibility, or customer message will be changed automatically/i);
});

test("assistant schedule dispatch review is blocked for field roles", () => {
  const command = resolveAssistantScheduleDispatchCommand("Open schedule dispatch for Westview Warehouse", {
    permissions: { jobs: { canView: true, canManageField: true, canManageAll: false } },
    jobs: [{ id: "JOB-1", title: "Westview Warehouse", status: "scheduled" }],
  });

  assert.equal(command.type, "blocked-command");
  assert.match(command.message, /Field users stay blocked/i);
});

test("assistant routes schedule dispatch before generic schedule navigation", () => {
  const command = resolveApexAssistantCommand("Open schedule dispatch for Westview Warehouse", {
    commandContext: {
      permissions: { jobs: { canView: true, canManageAll: true } },
      jobs: [{ id: "JOB-1", title: "Westview Warehouse", status: "scheduled", scheduledStart: "2026-05-21T07:00" }],
    },
  });

  assert.equal(command.type, "schedule-dispatch-review");
  assert.equal(command.matches[0].jobId, "JOB-1");
});

test("assistant keeps generic schedule navigation out of dispatch review", () => {
  const command = resolveApexAssistantCommand("open schedule");

  assert.equal(command.type, "route");
  assert.equal(command.moduleId, "schedule");
});

test("assistant opens imported draft review without write actions", () => {
  const command = resolveAssistantImportedDraftReviewCommand("Review imported draft for Westview Warehouse", {
    permissions: { jobDraftImports: { canView: true, canManage: true, canCreateJob: true } },
    jobDraftImports: [
      {
        id: "DRAFT-1",
        jobName: "Westview Warehouse",
        customerName: "ABC Builders",
        city: "Salem",
        status: "Needs Review",
      },
    ],
  });

  assert.equal(command.type, "imported-draft-review");
  assert.equal(command.matches.length, 1);
  assert.equal(command.matches[0].importedDraftId, "DRAFT-1");
  assert.match(command.message, /No package import, customer creation, job creation, draft save, or field handoff will happen automatically/i);
});

test("assistant imported draft review is blocked for field roles", () => {
  const command = resolveAssistantImportedDraftReviewCommand("Review imported draft for Westview Warehouse", {
    permissions: { jobDraftImports: { canView: false, canManage: false, canCreateJob: false } },
    jobDraftImports: [{ id: "DRAFT-1", jobName: "Westview Warehouse", status: "Needs Review" }],
  });

  assert.equal(command.type, "blocked-command");
  assert.match(command.message, /Field users stay blocked/i);
});

test("assistant routes imported draft review before generic imported draft navigation", () => {
  const command = resolveApexAssistantCommand("Open imported draft review for Westview Warehouse", {
    commandContext: {
      permissions: { jobDraftImports: { canView: true, canManage: true } },
      jobDraftImports: [{ id: "DRAFT-1", jobName: "Westview Warehouse", customerName: "ABC Builders", status: "Needs Review" }],
    },
  });

  assert.equal(command.type, "imported-draft-review");
  assert.equal(command.matches[0].importedDraftId, "DRAFT-1");
});

test("assistant keeps generic imported drafts navigation out of draft review", () => {
  const command = resolveApexAssistantCommand("open imported drafts");

  assert.equal(command.type, "route");
  assert.equal(command.moduleId, "jobDraftImports");
});

test("assistant opens copy-only support workflow context without auto-send", () => {
  const command = resolveAssistantSupportWorkflowCommand("Prepare support for blocked report uploads", {
    permissions: {
      support: { canView: true },
      reports: { canView: true, canReview: true },
      uploads: { canView: true },
      jobs: { canManageAll: true },
    },
  });

  assert.equal(command.type, "support-workflow-review");
  assert.equal(command.moduleId, "support");
  assert.equal(command.workflow, "Photos / uploads");
  assert.equal(command.blockerLevel, "Blocking office work");
  assert.match(command.message, /No ticket, email, text, upload, permission change, package change, or escalation/i);
  assert.match(command.seed.summary, /Assistant prefill/);
});

test("assistant support workflow is blocked when support access is absent", () => {
  const command = resolveAssistantSupportWorkflowCommand("Prepare support for blocked job schedule", {
    permissions: { support: { canView: false }, jobs: { canManageAll: true } },
  });

  assert.equal(command.type, "blocked-command");
  assert.match(command.message, /require support access/i);
});

test("assistant support workflow keeps field users in field-safe support context", () => {
  const command = resolveAssistantSupportWorkflowCommand("Prepare support for blocked field job", {
    permissions: {
      support: { canView: true },
      jobs: { canView: true, canManageField: true, canManageAll: false },
      reports: { canCreate: true },
    },
  });

  assert.equal(command.type, "support-workflow-review");
  assert.equal(command.workflow, "Jobs / schedule");
  assert.equal(command.blockerLevel, "Blocking field work");
});

test("assistant keeps generic support navigation out of workflow support", () => {
  const command = resolveApexAssistantCommand("open support");

  assert.equal(command.type, "route");
  assert.equal(command.moduleId, "support");
});

test("assistant opens pilot handoff readiness without customer or production actions", () => {
  const command = resolveAssistantPilotHandoffReadinessCommand("Review pilot handoff readiness", {
    permissions: {
      customers: { canView: true, canManage: true },
      jobs: { canView: true, canManageAll: true },
      users: { canManage: true },
      settings: { canView: true },
      support: { canView: true },
    },
    customers: [
      { id: "CUST-1", name: "ABC Builders", status: "active", phone: "555-0100", email: "ops@example.com" },
      { id: "CUST-2", name: "GC Prospect", status: "prospect", phone: "", email: "" },
    ],
    jobs: [
      { id: "JOB-1", title: "Westview Warehouse", status: "scheduled", scheduledStart: "2026-05-20", crew: "Luis" },
      { id: "JOB-2", title: "Maple Ridge", status: "active" },
    ],
    leads: [{ id: "LEAD-1" }],
    users: [
      { id: "USER-1", name: "Luis G.", role: "foreman" },
      { id: "USER-2", name: "Jason M.", role: "admin" },
    ],
    commandCenter: { stats: { fieldProofGaps: 2, reviewQueueItems: 1 } },
  });

  assert.equal(command.type, "pilot-handoff-readiness");
  assert.equal(command.moduleId, "customers");
  assert.equal(command.actions.map((action) => action.moduleId).join(","), "customers,jobs,settings,support");
  assert.equal(command.readinessSummary.length, 4);
  assert.equal(command.readinessSummary.some((item) => /missing contact detail/i.test(item.detail)), true);
  assert.equal(command.readinessSummary.some((item) => /does not create accounts, invite users, contact customers/i.test(item.detail)), true);
  assert.match(command.message, /No customer login, invite, message, support ticket, package change, account creation, demo reset, or production action/i);
});

test("assistant pilot handoff readiness is blocked for field users", () => {
  const command = resolveAssistantPilotHandoffReadinessCommand("Review pilot handoff readiness", {
    permissions: {
      customers: { canView: false, canManage: false },
      jobs: { canView: true, canManageField: true, canManageAll: false },
      support: { canView: true },
      settings: { canView: false },
    },
    customers: [{ id: "CUST-1", name: "ABC Builders" }],
  });

  assert.equal(command.type, "blocked-command");
  assert.match(command.message, /Field users stay blocked/i);
});

test("assistant routes pilot handoff readiness before generic customer navigation", () => {
  const command = resolveApexAssistantCommand("Review customer handoff readiness for pilot kickoff", {
    commandContext: {
      permissions: {
        customers: { canView: true, canManage: true },
        jobs: { canView: true, canManageAll: true },
        settings: { canView: true },
      },
      customers: [{ id: "CUST-1", name: "ABC Builders", status: "active" }],
    },
  });

  assert.equal(command.type, "pilot-handoff-readiness");
  assert.equal(command.moduleId, "customers");
});

test("assistant opens material planning review packet without ordering", () => {
  const command = resolveAssistantMaterialPlanningCommand("Review material plan for Westview Warehouse", {
    permissions: {
      estimates: { canView: true, canUseGcPackets: true },
      jobs: { canManageAll: true },
      calculator: { canUse: true },
      deliveryTickets: { canView: true },
      reports: { canView: true },
    },
    estimates: [
      {
        id: "EST-1",
        title: "Westview Warehouse slab",
        status: "approved",
        customerName: "ABC Builders",
        items: [{ id: "ITEM-1" }],
        takeoffRows: [{ id: "TO-1" }],
      },
    ],
    jobs: [
      {
        id: "JOB-1",
        title: "Westview Warehouse",
        customer: "ABC Builders",
        materialNotes: "4000 PSI mix, confirm sawcut timing.",
        calculatorResults: [{ id: "CALC-1" }],
      },
    ],
    deliveryTickets: [
      { id: "TICKET-1", jobId: "JOB-1", yardsDelivered: 8, supplier: "Ready Mix", truckNumber: "12", ticketNumber: "445" },
      { id: "TICKET-2", jobId: "JOB-1", yardsDelivered: 0 },
    ],
    dailyReports: [
      { id: "REPORT-1", jobId: "JOB-1", concretePoured: true, yardsPoured: 8 },
    ],
    calculatorResults: [{ id: "CALC-1" }],
  });

  assert.equal(command.type, "material-planning-review");
  assert.equal(command.matches.length, 2);
  assert.equal(command.actions.some((action) => action.moduleId === "calculator"), true);
  assert.equal(command.sourceSummary.some((item) => /Delivery proof/i.test(item.label)), true);
  assert.match(command.message, /No order, supplier message, purchase order, job conversion, price approval, or record change/i);
});

test("assistant material planning is blocked for field users", () => {
  const command = resolveAssistantMaterialPlanningCommand("Review material plan for today", {
    permissions: {
      estimates: { canView: false, canUseGcPackets: false },
      jobs: { canManageAll: false, canManageField: true },
      calculator: { canUse: true },
    },
    jobs: [{ id: "JOB-1", title: "Assigned Field Job" }],
  });

  assert.equal(command.type, "blocked-command");
  assert.match(command.message, /Field users stay limited/i);
});

test("assistant material planning is package locked without premium packet tools", () => {
  const command = resolveAssistantMaterialPlanningCommand("Review material planning for Westview", {
    permissions: {
      estimates: { canView: true, canUseGcPackets: false },
      jobs: { canManageAll: true },
      calculator: { canUse: true },
    },
    estimates: [{ id: "EST-1", title: "Westview" }],
  });

  assert.equal(command.type, "package-blocked");
  assert.match(command.message, /Premium review workflow/i);
});

test("assistant blocks material ordering before material planning review", () => {
  const command = resolveApexAssistantCommand("Order concrete materials for Westview Warehouse", {
    commandContext: {
      permissions: {
        estimates: { canView: true, canUseGcPackets: true },
        jobs: { canManageAll: true },
        calculator: { canUse: true },
      },
      jobs: [{ id: "JOB-1", title: "Westview Warehouse" }],
    },
  });

  assert.equal(command.type, "blocked-command");
  assert.match(command.message, /will not order materials/i);
});

test("assistant opens release readiness review without production action", () => {
  const command = resolveAssistantReleaseReadinessCommand("Review release readiness and app health", {
    permissions: {
      appHealth: { canView: true },
      settings: { canView: true },
      support: { canView: true },
      audit: { canView: true },
    },
    commandCenter: {
      stats: { fieldProofGaps: 2, reviewQueueItems: 3, moneyReadyItems: 1 },
      watchtowerQueue: [{ id: "proof", title: "Proof gap" }],
      watchtowerActions: [{ id: "report", title: "Report review" }],
    },
    auditEvents: [
      { id: "AUD-1", type: "user_role_updated", summary: "Role changed" },
      { id: "AUD-2", type: "job_updated", summary: "Job updated" },
    ],
    activity: [{ id: "ACT-1" }],
  });

  assert.equal(command.type, "release-readiness-review");
  assert.equal(command.moduleId, "appHealth");
  assert.equal(command.actions.some((action) => action.moduleId === "appHealth"), true);
  assert.equal(command.actions.some((action) => action.moduleId === "support"), true);
  assert.equal(command.readinessSummary.some((item) => /does not deploy, roll back, restore backups/i.test(item.detail)), true);
  assert.match(command.message, /No deploy, rollback, backup restore, package change, support escalation, or production action/i);
});

test("assistant release readiness is package locked without App Health", () => {
  const command = resolveAssistantReleaseReadinessCommand("Review release readiness", {
    permissions: {
      appHealth: { canView: false },
      settings: { canView: true },
      audit: { canView: true },
    },
  });

  assert.equal(command.type, "package-blocked");
  assert.match(command.message, /Premium review tools/i);
});

test("assistant release readiness is blocked for field users", () => {
  const command = resolveAssistantReleaseReadinessCommand("Open app health release readiness", {
    permissions: {
      appHealth: { canView: false },
      support: { canView: true },
      jobs: { canManageField: true },
    },
  });

  assert.equal(command.type, "blocked-command");
  assert.match(command.message, /Field users stay blocked/i);
});

test("assistant routes release readiness before generic app health navigation", () => {
  const command = resolveApexAssistantCommand("Open app health and review release safety", {
    commandContext: {
      permissions: {
        appHealth: { canView: true },
        settings: { canView: true },
        audit: { canView: true },
      },
      auditEvents: [{ id: "AUD-1", type: "backup_exported" }],
    },
  });

  assert.equal(command.type, "release-readiness-review");
  assert.equal(command.moduleId, "appHealth");
});

test("assistant opens delivery ticket review without write actions", () => {
  const command = resolveAssistantDeliveryTicketReviewCommand("Review delivery ticket for Westview Warehouse", {
    permissions: { deliveryTickets: { canManageAll: true } },
    deliveryTickets: [
      {
        id: "TICKET-1",
        ticketNumber: "CT-204",
        supplier: "Salem Ready Mix",
        truckNumber: "TR-8",
        yardsDelivered: 8,
        ticketUploadId: "",
        reportId: "",
        job: { id: "JOB-1", title: "Westview Warehouse", customer: "ABC Builders" },
      },
    ],
  });

  assert.equal(command.type, "delivery-ticket-review");
  assert.equal(command.matches.length, 1);
  assert.equal(command.matches[0].ticketId, "TICKET-1");
  assert.match(command.message, /No ticket will be saved, archived, linked, billed, or sent automatically/i);
});

test("assistant delivery ticket review is blocked for field roles", () => {
  const command = resolveAssistantDeliveryTicketReviewCommand("Open delivery tickets needing review", {
    permissions: { deliveryTickets: { canView: true, canCreate: true, canEditOwn: true, canManageAll: false } },
    deliveryTickets: [{ id: "TICKET-1", ticketNumber: "CT-204", job: { title: "Field Job" } }],
  });

  assert.equal(command.type, "blocked-command");
  assert.match(command.message, /Field users stay limited/i);
});

test("assistant routes delivery ticket review before generic ticket navigation", () => {
  const command = resolveApexAssistantCommand("Open delivery tickets needing review for Westview Warehouse", {
    commandContext: {
      permissions: { deliveryTickets: { canManageAll: true } },
      deliveryTickets: [
        { id: "TICKET-1", ticketNumber: "CT-204", job: { title: "Westview Warehouse" } },
      ],
    },
  });

  assert.equal(command.type, "delivery-ticket-review");
  assert.equal(command.matches[0].ticketId, "TICKET-1");
});

test("assistant opens completed pre-pour review without write actions", () => {
  const command = resolveAssistantPrePourReviewCommand("Review completed pre-pour checklist for Westview Warehouse", {
    permissions: { prePour: { canView: true, canReview: true, canManageAll: true } },
    prePourChecklists: [
      {
        id: "PRE-1",
        status: "completed",
        incompleteItemCount: 0,
        completedByName: "Luis G.",
        job: { id: "JOB-1", title: "Westview Warehouse", customer: "ABC Builders" },
        items: [{ id: "ITEM-1", label: "Base compacted", status: "checked" }],
      },
    ],
  });

  assert.equal(command.type, "pre-pour-review");
  assert.equal(command.matches.length, 1);
  assert.equal(command.matches[0].checklistId, "PRE-1");
  assert.match(command.message, /No Job Prep checklist will be completed, reviewed, reopened, archived, or changed automatically/i);
});

test("assistant pre-pour review is blocked for field roles", () => {
  const command = resolveAssistantPrePourReviewCommand("Open pre-pour checklists needing review", {
    permissions: { prePour: { canView: true, canManage: true, canComplete: true, canReview: false, canManageAll: false } },
    prePourChecklists: [{ id: "PRE-1", status: "completed", job: { title: "Field Job" } }],
  });

  assert.equal(command.type, "blocked-command");
  assert.match(command.message, /Field users stay limited/i);
});

test("assistant routes pre-pour review before generic checklist navigation", () => {
  const command = resolveApexAssistantCommand("Open pre-pour checklists needing review for Westview Warehouse", {
    commandContext: {
      permissions: { prePour: { canView: true, canReview: true, canManageAll: true } },
      prePourChecklists: [
        { id: "PRE-1", status: "completed", job: { title: "Westview Warehouse" } },
      ],
    },
  });

  assert.equal(command.type, "pre-pour-review");
  assert.equal(command.matches[0].checklistId, "PRE-1");
});

test("assistant opens completed post-pour review without write actions", () => {
  const command = resolveAssistantPostPourReviewCommand("Review completed post-pour checklist for Westview Warehouse", {
    permissions: { postPour: { canView: true, canReview: true, canManageAll: true } },
    postPourChecklists: [
      {
        id: "POST-1",
        status: "completed",
        incompleteItemCount: 1,
        completedByName: "Luis G.",
        job: { id: "JOB-1", title: "Westview Warehouse", customer: "ABC Builders" },
        items: [{ id: "ITEM-1", label: "Cleanup complete", status: "unchecked" }],
      },
    ],
  });

  assert.equal(command.type, "post-pour-review");
  assert.equal(command.matches.length, 1);
  assert.equal(command.matches[0].checklistId, "POST-1");
  assert.match(command.message, /No Closeout checklist will be completed, reviewed, reopened, archived, or changed automatically/i);
});

test("assistant post-pour review is blocked for field roles", () => {
  const command = resolveAssistantPostPourReviewCommand("Open post-pour checklists needing review", {
    permissions: { postPour: { canView: true, canManage: true, canComplete: true, canReview: false, canManageAll: false } },
    postPourChecklists: [{ id: "POST-1", status: "completed", job: { title: "Field Job" } }],
  });

  assert.equal(command.type, "blocked-command");
  assert.match(command.message, /Field users stay limited/i);
});

test("assistant routes post-pour review before generic checklist navigation", () => {
  const command = resolveApexAssistantCommand("Open post-pour checklists needing review for Westview Warehouse", {
    commandContext: {
      permissions: { postPour: { canView: true, canReview: true, canManageAll: true } },
      postPourChecklists: [
        { id: "POST-1", status: "completed", job: { title: "Westview Warehouse" } },
      ],
    },
  });

  assert.equal(command.type, "post-pour-review");
  assert.equal(command.matches[0].checklistId, "POST-1");
});

test("assistant opens safety incident review without write actions", () => {
  const command = resolveAssistantSafetyIncidentReviewCommand("Review safety incident for Westview Warehouse", {
    permissions: { safety: { canReviewIncidents: true, canManage: true } },
    safetyIncidents: [
      {
        id: "INC-1",
        title: "Wet saw guard concern",
        status: "open",
        severity: "high",
        immediateAction: "",
        job: { id: "JOB-1", title: "Westview Warehouse", customer: "ABC Builders" },
      },
    ],
  });

  assert.equal(command.type, "safety-incident-review");
  assert.equal(command.matches.length, 1);
  assert.equal(command.matches[0].incidentId, "INC-1");
  assert.match(command.message, /No incident will be reviewed, resolved, archived, messaged, or changed automatically/i);
});

test("assistant safety incident review is blocked for field roles", () => {
  const command = resolveAssistantSafetyIncidentReviewCommand("Open safety incidents needing review", {
    permissions: { safety: { canView: true, canSubmitIncidents: true, canReviewIncidents: false, canManage: false } },
    safetyIncidents: [{ id: "INC-1", title: "Field concern", status: "open", job: { title: "Field Job" } }],
  });

  assert.equal(command.type, "blocked-command");
  assert.match(command.message, /Field users stay limited/i);
});

test("assistant routes safety incident review before generic safety navigation", () => {
  const command = resolveApexAssistantCommand("Open safety incidents needing review for Westview Warehouse", {
    commandContext: {
      permissions: { safety: { canReviewIncidents: true } },
      safetyIncidents: [
        { id: "INC-1", title: "Guard concern", status: "open", severity: "high", job: { title: "Westview Warehouse" } },
      ],
    },
  });

  assert.equal(command.type, "safety-incident-review");
  assert.equal(command.matches[0].incidentId, "INC-1");
});

test("assistant keeps generic safety navigation out of office incident review", () => {
  const command = resolveApexAssistantCommand("open safety", {
    commandContext: {
      permissions: { safety: { canSubmitIncidents: true, canReviewIncidents: false, canManage: false } },
      safetyIncidents: [
        { id: "INC-1", title: "Guard concern", status: "open", severity: "high", job: { title: "Westview Warehouse" } },
      ],
    },
  });

  assert.equal(command.type, "route");
  assert.equal(command.moduleId, "incidents");
});

test("assistant opens tool checklist review without write actions", () => {
  const command = resolveAssistantToolChecklistReviewCommand("Review submitted tool checklist for Westview Warehouse", {
    permissions: { toolChecklist: { canUse: true, canReview: true, canManageAll: true } },
    toolChecklists: [
      {
        id: "TC-1",
        title: "Pour day loadout",
        status: "submitted",
        missingItemCount: 1,
        damagedItemCount: 1,
        assignedForemanName: "Luis G.",
        job: { id: "JOB-1", title: "Westview Warehouse", customer: "ABC Builders" },
        items: [
          { id: "ITEM-1", name: "Bull float", status: "missing" },
          { id: "ITEM-2", name: "Screed", status: "damaged" },
        ],
      },
    ],
  });

  assert.equal(command.type, "tool-checklist-review");
  assert.equal(command.matches.length, 1);
  assert.equal(command.matches[0].checklistId, "TC-1");
  assert.match(command.message, /No checklist will be submitted, reviewed, archived, toggled, or changed automatically/i);
});

test("assistant tool checklist review is blocked for field roles", () => {
  const command = resolveAssistantToolChecklistReviewCommand("Open submitted tool checklists needing review", {
    permissions: { toolChecklist: { canUse: true, canContribute: true, canReview: false, canManageAll: false, canManage: false } },
    toolChecklists: [{ id: "TC-1", title: "Field loadout", status: "submitted", job: { title: "Field Job" } }],
  });

  assert.equal(command.type, "blocked-command");
  assert.match(command.message, /Field users stay limited/i);
});

test("assistant routes tool checklist review before generic checklist navigation", () => {
  const command = resolveApexAssistantCommand("Open tool checklists needing review for Westview Warehouse", {
    commandContext: {
      permissions: { toolChecklist: { canUse: true, canReview: true, canManageAll: true } },
      toolChecklists: [
        { id: "TC-1", title: "Pour day loadout", status: "submitted", job: { title: "Westview Warehouse" } },
      ],
    },
  });

  assert.equal(command.type, "tool-checklist-review");
  assert.equal(command.matches[0].checklistId, "TC-1");
});

test("assistant keeps generic tools navigation out of office checklist review", () => {
  const command = resolveApexAssistantCommand("open tools", {
    commandContext: {
      permissions: { toolChecklist: { canUse: true, canContribute: true, canReview: false, canManageAll: false } },
      toolChecklists: [
        { id: "TC-1", title: "Pour day loadout", status: "submitted", job: { title: "Westview Warehouse" } },
      ],
    },
  });

  assert.equal(command.type, "route");
  assert.equal(command.moduleId, "toolChecklist");
});

test("assistant routes plain foreman handoff to Jobs before estimate packet tools", () => {
  const command = resolveApexAssistantCommand("Prepare foreman handoff for Westview Warehouse", {
    commandContext: {
      permissions: { jobs: { canManageAll: true }, estimates: { canView: true, canUseGcPackets: true } },
      jobs: [{ id: "JOB-1", title: "Westview Warehouse", startupStatus: "Needs Review" }],
      estimates: [{ id: "EST-1", title: "Westview Warehouse estimate", status: "approved" }],
    },
  });

  assert.equal(command.type, "job-handoff-review");
  assert.equal(command.matches[0].jobId, "JOB-1");
});

test("assistant classifies lead to estimate rough-note commands with a review match", () => {
  const command = resolveAssistantEstimateDraftCommand(
    "Open ABC Builders and start an estimate with rough notes: Demo old concrete, pour 500 SF 4-inch broom finish, exclude permits.",
    {
      permissions: {
        estimates: { canManage: true, canUseAiRoughNotes: true },
        leads: { canView: true },
      },
      leads: [
        {
          id: "LEAD-ABC",
          customer: "ABC Builders",
          project: "Salem warehouse slab",
          city: "Salem",
          status: "Needs Estimate",
        },
      ],
      customers: [],
    },
  );

  assert.equal(command.type, "estimate-draft-review");
  assert.equal(command.matches.length, 1);
  assert.equal(command.matches[0].leadId, "LEAD-ABC");
  assert.match(command.roughNotes, /500 SF/);
  assert.match(command.message, /ABC Builders/);
});

test("assistant operator command turns a matched lead into an internal draft action plan", () => {
  const command = resolveAssistantOperatorCommand(
    "Turn ABC Builders lead into an estimate and send it",
    {
      permissions: {
        estimates: { canManage: true, canUseAiRoughNotes: true },
        leads: { canView: true },
      },
      leads: [
        {
          id: "LEAD-ABC",
          customer: "ABC Builders",
          project: "Salem warehouse slab",
          city: "Salem",
          status: "Needs Estimate",
        },
      ],
      customers: [],
    },
  );

  assert.equal(command.type, "estimate-draft-review");
  assert.equal(command.operatorMode, "internal_draft_action");
  assert.equal(command.operatorAutonomyLevel, "L3 internal draft");
  assert.equal(command.matches.length, 1);
  assert.equal(command.matches[0].leadId, "LEAD-ABC");
  assert.equal(command.actionLabel, "Do it: create draft");
  assert.match(command.message, /create the internal draft estimate/i);
  assert.equal(command.blockedExternalActions.some((action) => action.id === "customer-send"), true);
});

test("assistant command routes lead-to-estimate operator intent before external-send blocking", () => {
  const command = resolveApexAssistantCommand("Turn ABC Builders lead into an estimate and email it", {
    commandContext: {
      permissions: {
        estimates: { canManage: true, canUseAiRoughNotes: true },
        leads: { canView: true },
      },
      leads: [{ id: "LEAD-ABC", customer: "ABC Builders", project: "Warehouse" }],
    },
  });

  assert.equal(command.type, "estimate-draft-review");
  assert.equal(command.operatorMode, "internal_draft_action");
  assert.equal(command.matches[0].leadId, "LEAD-ABC");
  assert.equal(command.blockedExternalActions.some((action) => action.id === "customer-send"), true);
});

test("assistant estimate command shows choices for ambiguous records", () => {
  const command = resolveAssistantEstimateDraftCommand("Start estimate for ABC Builders with notes: pour slab.", {
    permissions: { estimates: { canManage: true, canUseAiRoughNotes: true } },
    leads: [
      { id: "LEAD-1", customer: "ABC Builders", project: "Warehouse slab" },
      { id: "LEAD-2", customer: "ABC Builders", project: "Sidewalk repair" },
    ],
    customers: [{ id: "CUSTOMER-ABC", name: "ABC Builders" }],
  });

  assert.equal(command.type, "estimate-draft-review");
  assert.equal(command.matches.length, 3);
  assert.match(command.message, /multiple/i);
});

test("assistant estimate command falls back to a clean new draft without a match", () => {
  const command = resolveAssistantEstimateDraftCommand("Start estimate with notes: Customer: Newco Builders. Pour 300 SF sidewalk.", {
    permissions: { estimates: { canManage: true, canUseAiRoughNotes: true } },
    leads: [],
    customers: [],
  });

  assert.equal(command.type, "estimate-draft-review");
  assert.deepEqual(command.matches, []);
  assert.equal(command.fallback.customerName, "Newco Builders");
  assert.match(command.fallback.label, /Newco Builders/);
});

test("assistant estimate command blocks field or ungated rough-note access", () => {
  const fieldDenied = resolveAssistantEstimateDraftCommand("Start estimate with notes: pour slab.", {
    permissions: { estimates: { canManage: false, canUseAiRoughNotes: false } },
  });
  const packageDenied = resolveAssistantEstimateDraftCommand("Start estimate with notes: pour slab.", {
    permissions: { estimates: { canManage: true, canUseAiRoughNotes: false } },
  });

  assert.equal(fieldDenied.type, "blocked-command");
  assert.match(fieldDenied.message, /Field roles stay blocked/i);
  assert.equal(packageDenied.type, "package-blocked");
  assert.match(packageDenied.message, /Premium AI Rough Notes/i);
});

test("assistant opens GC packet tools for a visible estimate without write actions", () => {
  const command = resolveAssistantEstimatePacketCommand("Prepare GC packet for Salem warehouse", {
    permissions: {
      estimates: { canView: true, canUseGcPackets: true },
    },
    estimates: [
      {
        id: "EST-1",
        title: "Salem warehouse slab",
        status: "draft",
        customerName: "ABC Builders",
        number: "EST-2025-041",
      },
    ],
  });

  assert.equal(command.type, "estimate-packet-review");
  assert.equal(command.matches.length, 1);
  assert.equal(command.matches[0].estimateId, "EST-1");
  assert.match(command.message, /nothing will be sent or printed automatically/i);
});

test("assistant GC packet command requires estimate access and package tools", () => {
  const fieldDenied = resolveAssistantEstimatePacketCommand("Prepare GC packet for Salem warehouse", {
    permissions: { estimates: { canView: false, canUseGcPackets: false } },
  });
  const packageDenied = resolveAssistantEstimatePacketCommand("Prepare GC packet for Salem warehouse", {
    permissions: { estimates: { canView: true, canUseGcPackets: false } },
  });

  assert.equal(fieldDenied.type, "blocked-command");
  assert.match(fieldDenied.message, /Field roles stay blocked/i);
  assert.equal(packageDenied.type, "package-blocked");
  assert.match(packageDenied.message, /GC packet prep is available/i);
});

test("assistant command routes GC packet intent before generic estimate drafts", () => {
  const command = resolveApexAssistantCommand("Prepare GC packet for ABC Builders", {
    commandContext: {
      permissions: { estimates: { canView: true, canManage: true, canUseAiRoughNotes: true, canUseGcPackets: true } },
      estimates: [{ id: "EST-ABC", title: "ABC Builders warehouse", customerName: "ABC Builders" }],
      leads: [{ id: "LEAD-ABC", customer: "ABC Builders", project: "Warehouse" }],
    },
  });

  assert.equal(command.type, "estimate-packet-review");
  assert.equal(command.matches[0].estimateId, "EST-ABC");
});

test("assistant opens approved estimate-to-job handoff without creating jobs", () => {
  const command = resolveAssistantEstimateJobHandoffCommand("Prepare job handoff for Salem warehouse", {
    permissions: {
      estimates: { canManage: true, canUseGcPackets: true },
      jobs: { canCreate: true },
    },
    estimates: [
      {
        id: "EST-READY",
        title: "Salem warehouse slab",
        status: "approved",
        customerName: "ABC Builders",
        number: "EST-2025-077",
        scopeSummary: "Demo and replace warehouse slab.",
        referenceRows: [{ id: "REF-1" }],
      },
    ],
    jobs: [
      { id: "JOB-OLD", title: "ABC Builders service work", customer: "ABC Builders" },
    ],
  });

  assert.equal(command.type, "estimate-job-handoff-review");
  assert.equal(command.matches.length, 1);
  assert.equal(command.matches[0].estimateId, "EST-READY");
  assert.equal(command.matches[0].readyForJobHandoff, true);
  assert.deepEqual(command.matches[0].reviewWarnings, []);
  assert.equal(command.handoffSummary.some((item) => /No job, schedule, crew assignment/i.test(item.detail)), true);
  assert.equal(command.actions.some((action) => action.moduleId === "jobs"), true);
  assert.match(command.message, /No job, schedule, crew assignment, or customer message/i);
});

test("assistant estimate-to-job handoff requires office job creation and premium packet access", () => {
  const fieldDenied = resolveAssistantEstimateJobHandoffCommand("Convert approved estimate to job", {
    permissions: { estimates: { canManage: false, canUseGcPackets: false }, jobs: { canCreate: false } },
  });
  const packageDenied = resolveAssistantEstimateJobHandoffCommand("Convert approved estimate to job", {
    permissions: { estimates: { canManage: true, canUseGcPackets: false }, jobs: { canCreate: true } },
  });

  assert.equal(fieldDenied.type, "blocked-command");
  assert.match(fieldDenied.message, /Field users stay blocked/i);
  assert.equal(packageDenied.type, "package-blocked");
  assert.match(packageDenied.message, /Premium review workflow/i);
});

test("assistant estimate-to-job handoff does not treat unapproved estimates as ready", () => {
  const command = resolveAssistantEstimateJobHandoffCommand("Review job setup for West slab", {
    permissions: { estimates: { canManage: true, canUseGcPackets: true }, jobs: { canCreate: true } },
    estimates: [
      { id: "EST-DRAFT", title: "West slab", status: "draft", customerName: "Westview" },
    ],
  });

  assert.equal(command.type, "estimate-job-handoff-review");
  assert.equal(command.matches[0].readyForJobHandoff, false);
  assert.match(command.matches[0].helper, /Not approved yet/i);
  assert.equal(command.matches[0].reviewWarnings.includes("approval review needed"), true);
  assert.equal(command.matches[0].reviewWarnings.includes("scope/handoff notes missing"), true);
  assert.equal(command.handoffSummary.some((item) => /still need approval review/i.test(item.detail)), true);
});

test("assistant blocks unsafe automation language before estimate matching", () => {
  const command = resolveApexAssistantCommand("send this estimate to ABC Builders", {
    commandContext: {
      permissions: { estimates: { canManage: true, canUseAiRoughNotes: true } },
      customers: [{ id: "CUSTOMER-ABC", name: "ABC Builders" }],
    },
  });

  assert.equal(command.type, "blocked-command");
  assert.equal(command.moduleId, "commandCenter");
  assert.match(command.message, /will not send/i);
});
