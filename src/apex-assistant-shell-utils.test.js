import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveApexAssistantShellState,
  resolveApexAssistantCommand,
  resolveAssistantChangeOrderReviewCommand,
  resolveAssistantCrewReadinessCommand,
  resolveAssistantCustomerAccountCommand,
  resolveAssistantDeliveryTicketReviewCommand,
  resolveAssistantEstimateDraftCommand,
  resolveAssistantEstimateJobHandoffCommand,
  resolveAssistantEstimatePacketCommand,
  resolveAssistantJobHandoffCommand,
  resolveAssistantLeadFollowUpCommand,
  resolveAssistantMissingProofCommand,
  resolveAssistantPostPourReviewCommand,
  resolveAssistantPrePourReviewCommand,
  resolveAssistantReportReviewCommand,
  resolveAssistantSafetyIncidentReviewCommand,
  resolveAssistantScheduleDispatchCommand,
  resolveAssistantTimeReviewCommand,
  resolveAssistantToolChecklistReviewCommand,
  resolveAssistantUploadReviewCommand,
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

test("assistant shell is available to office roles even when AI Office is not included", () => {
  const state = deriveApexAssistantShellState({
    permissions: { aiOffice: { canView: false }, jobs: { canManageAll: true }, leads: { canView: true } },
    commandCenter: {
      watchtowerQueue: [{ id: "job:1", title: "Job startup", moduleId: "jobs" }],
    },
  });

  assert.equal(state.canView, true);
  assert.equal(state.watchtowerQueue.length, 1);
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
  assert.match(command.message, /No Pre-Pour checklist will be completed, reviewed, reopened, archived, or changed automatically/i);
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
  assert.match(command.message, /No Post-Pour checklist will be completed, reviewed, reopened, archived, or changed automatically/i);
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
      },
    ],
  });

  assert.equal(command.type, "estimate-job-handoff-review");
  assert.equal(command.matches.length, 1);
  assert.equal(command.matches[0].estimateId, "EST-READY");
  assert.equal(command.matches[0].readyForJobHandoff, true);
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
