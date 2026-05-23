import assert from "node:assert/strict";
import test from "node:test";

import { deriveAiOfficeAgentCommandCenter } from "./ai-office-utils.js";

test("AI Office agent command center builds role-safe review lanes from visible context", () => {
  const state = deriveAiOfficeAgentCommandCenter({
    permissions: {
      aiOffice: { canView: true, canManageLearning: true },
      opportunityScout: { canView: true },
      leads: { canView: true },
      jobs: { canView: true, canManageAll: true },
      estimates: { canView: true, canManage: true },
      reports: { canView: true, canReview: true },
      uploads: { canView: true, canManageAll: true },
      customers: { canView: true },
      settings: { canView: true },
      appHealth: { canView: true },
    },
    stats: { fieldProofGaps: 2, jobsReadyToBill: 1 },
    opportunityScout: {
      readiness: { label: "Found work needs review", tone: "red" },
      stats: { openFoundOpportunities: 2, checksNeeded: 1 },
      foundOpportunityQueue: [
        { id: "FO-1", title: "School sidewalk", agency: "Albany SD", trade: "Concrete", statusLabel: "Reviewing", tone: "red" },
      ],
    },
    leads: [
      { id: "LEAD-1", customer: "ABC Builders", status: "New", priority: "High", project: "Warehouse slab" },
      { id: "LEAD-2", customer: "Approved GC", status: "Approved" },
    ],
    jobs: [{ id: "JOB-1", title: "Westview Warehouse", status: "scheduled", startupStatus: "Needs Review" }],
    estimates: [
      { id: "EST-APPROVED", title: "Approved warehouse slab", status: "approved" },
      { id: "EST-DRAFT", title: "Draft patio estimate", status: "draft" },
    ],
    queueItems: [{ id: "Q-1", title: "Blocked proof", status: "Blocked" }],
    jobDraftImports: [{ id: "DRAFT-1", jobName: "Imported slab", status: "Ready" }],
    dailyReports: [{ id: "REPORT-1", status: "Submitted", jobTitle: "Westview Warehouse" }],
    uploads: [{ id: "UPLOAD-1", fileName: "finish.jpg" }],
    timeEntries: [{ id: "TIME-1", userName: "Mike R.", clockInAt: "2026-05-22T15:00:00.000Z", clockOutAt: "" }],
    changeOrderRequests: [{ id: "COR-1", title: "Added approach apron", status: "requested" }],
    safetyIncidents: [{ id: "SI-1", title: "Open trip hazard", status: "open" }],
    agentLearningPreferences: [
      { id: "ALP-1", title: "Fence proposal tone", preference: "Use concise fence proposal language.", status: "suggested" },
      { id: "ALP-2", title: "Approved concrete memory", preference: "Use broom finish as base.", status: "approved" },
    ],
    fieldOpsAgent: {
      canView: true,
      roleScope: "Company field risk",
      stats: { total: 2, critical: 1, warning: 1 },
      items: [
        {
          id: "fieldOps:safety:SI-1",
          title: "Open safety item",
          description: "Warehouse slab has an unresolved hazard.",
          severity: "critical",
          moduleId: "incidents",
          actionLabel: "Open safety",
          contextLabel: "Warehouse slab",
          relatedJobId: "JOB-1",
        },
      ],
    },
  });

  assert.equal(state.canView, true);
  assert.equal(state.modeLabel, "Review-first");
  assert.equal(state.workflowCards.some((card) => card.id === "opportunity-scout"), true);
  assert.equal(state.workflowCards.some((card) => card.id === "proof-closeout"), true);
  assert.equal(state.workflowCards.some((card) => card.id === "proof-closeout" && card.recordType === "dailyCloseout" && card.actionLabel === "Review closeout"), true);
  assert.equal(state.workflowCards.some((card) => card.id === "estimate-action-agent"), true);
  assert.equal(state.workflowCards.some((card) => card.id === "field-ops-agent"), true);
  assert.equal(state.workflowCards.some((card) => card.id === "release-readiness"), true);
  assert.equal(state.workflowCards.some((card) => card.id === "agent-learning"), true);
  assert.equal(state.focusRows[0].id, "learning-ALP-1");
  assert.equal(state.focusRows[1].id, "queue-Q-1");
  assert.equal(state.focusRows.some((row) => row.id === "estimate-handoff-EST-APPROVED" && row.actionMode === "jobHandoff"), true);
  assert.equal(state.focusRows.some((row) => row.id === "estimate-draft-EST-DRAFT" && row.actionMode === "packet"), true);
  assert.equal(state.focusRows.some((row) => row.id === "upload-UPLOAD-1" && row.recordType === "upload"), true);
  assert.equal(state.focusRows.some((row) => row.id === "time-TIME-1" && row.recordType === "timeEntry"), true);
  assert.equal(state.focusRows.some((row) => row.id === "change-order-COR-1" && row.recordType === "changeOrder"), true);
  assert.equal(state.focusRows.some((row) => row.id === "safety-SI-1" && row.recordType === "safetyIncident"), true);
  assert.equal(state.focusRows.some((row) => row.recordType === "fieldOps" && row.moduleId === "incidents"), true);
  assert.equal(state.focusRows.some((row) => row.recordType === "report" && row.moduleId === "reports"), true);
  assert.equal(state.counts.readyToBill, 1);
  assert.equal(state.counts.fieldOpsReview, 2);
  assert.equal(state.counts.suggestedLearning, 1);
  assert.equal(state.counts.jobHandoffEstimateReviews, 1);
  assert.equal(state.counts.draftEstimateReviews, 1);
  assert.equal(state.counts.closeoutBlockers, 3);
  assert.equal(state.counts.proofCloseoutReview, 6);
  assert.equal(state.counts.unlinkedUploads, 1);
  assert.match(state.summary, /routes into an existing Apex HQ workflow/i);
  assert.equal(state.guardrails.some((item) => /No auto-send/i.test(item.detail)), true);
});

test("AI Office agent command center surfaces review-only growth source intelligence", () => {
  const state = deriveAiOfficeAgentCommandCenter({
    permissions: {
      aiOffice: { canView: true },
      leads: { canView: true },
      jobs: { canManageAll: true },
      estimates: { canView: true },
    },
    leads: [
      { id: "LEAD-1", customer: "Warm GC", status: "Converted", source: "Referral" },
      { id: "LEAD-2", customer: "Repeat Builder", status: "New", source: "Referral", followUpDueAt: "2026-05-20" },
    ],
    estimates: [
      { id: "EST-1", leadId: "LEAD-2", title: "Warehouse apron", status: "sent", total: 62000, sentAt: "2026-05-10" },
    ],
  });

  const sourceRow = state.focusRows.find((row) => row.recordType === "growthSourceInsight");
  assert.ok(sourceRow);
  assert.match(sourceRow.title, /Referral/i);
  assert.match(sourceRow.description, /manual review signal/i);
  assert.equal(sourceRow.moduleId, "leads");
  assert.equal(sourceRow.record.blockedActions.some((item) => /No outreach/i.test(item)), true);
  assert.equal(state.counts.growthSourceInsights, 1);
});

test("AI Office agent command center surfaces copy-only review request drafts", () => {
  const state = deriveAiOfficeAgentCommandCenter({
    permissions: {
      aiOffice: { canView: true },
      leads: { canView: true },
      jobs: { canView: true, canManageAll: true },
      estimates: { canView: true },
    },
    jobs: [
      { id: "JOB-1", title: "Back patio replacement", customerName: "Salem Homeowner", status: "Completed", completedAt: "2026-05-16" },
    ],
  });

  const reviewRow = state.focusRows.find((row) => row.recordType === "growthReviewRequestDraft");
  assert.ok(reviewRow);
  assert.match(reviewRow.title, /Back patio replacement/i);
  assert.match(reviewRow.description, /copy-only/i);
  assert.equal(reviewRow.moduleId, "jobs");
  assert.equal(reviewRow.record.blockedActions.some((item) => /No email, SMS, survey/i.test(item)), true);
  assert.equal(state.counts.growthReviewRequestDrafts, 1);
});

test("AI Office agent command center surfaces review-only owner BI scorecards", () => {
  const state = deriveAiOfficeAgentCommandCenter({
    permissions: {
      aiOffice: { canView: true },
      leads: { canView: true },
      jobs: { canView: true, canManageAll: true },
      estimates: { canView: true },
      reports: { canView: true, canReview: true },
      uploads: { canView: true, canManageAll: true },
      deliveryTickets: { canManageAll: true },
      time: { canManageAll: true },
    },
    leads: [
      { id: "LEAD-1", customer: "Referral GC", status: "Converted", source: "Referral" },
      { id: "LEAD-2", customer: "New GC", status: "New", source: "Referral", followUpDueAt: "2026-05-20" },
    ],
    jobs: [{ id: "JOB-1", title: "Owner BI patio", status: "billing_ready" }],
    estimates: [
      { id: "EST-1", leadId: "LEAD-1", jobId: "JOB-1", status: "approved", grandTotal: 10000 },
      { id: "EST-2", leadId: "LEAD-2", status: "sent", total: 6000, sentAt: "2026-05-10" },
    ],
    dailyReports: [
      {
        id: "REPORT-1",
        jobId: "JOB-1",
        status: "reviewed",
        reportDate: "2026-05-21",
        workPerformed: "Finished patio",
        crewSummary: "Foreman + 2",
        weather: "Clear",
        job: { title: "Owner BI patio" },
      },
      {
        id: "REPORT-2",
        jobId: "JOB-1",
        status: "submitted",
        reportDate: "2026-05-22",
        workPerformed: "Cleanup",
        crewSummary: "Foreman + 1",
        weather: "Cloudy",
        job: { title: "Owner BI patio" },
      },
    ],
    uploads: [{ id: "UPLOAD-1", jobId: "JOB-1" }],
    timeEntries: [{ id: "TIME-1", jobId: "JOB-1", totalMinutes: 300, status: "completed" }],
    deliveryTickets: [{ id: "DT-1", jobId: "JOB-1", reportId: "REPORT-1", ticketUploadId: "UPLOAD-1", supplier: "Ready Mix", ticketNumber: "RM-1", yardsDelivered: 6 }],
    proofStateByReportId: new Map([
      ["REPORT-1", { gapCount: 0 }],
      ["REPORT-2", { gapCount: 1 }],
    ]),
  });

  const card = state.workflowCards.find((item) => item.id === "owner-bi");
  const row = state.focusRows.find((item) => item.recordType === "ownerBusinessIntelligence");

  assert.ok(card);
  assert.equal(card.actionLabel, "Review BI");
  assert.ok(row);
  assert.match(row.description, /Review-only/i);
  assert.equal(state.counts.ownerBiScorecards, 4);
  assert.ok(state.counts.ownerBiReviewRows > 0);
});

test("AI Office agent command center blocks field-only users", () => {
  const state = deriveAiOfficeAgentCommandCenter({
    permissions: {
      aiOffice: { canView: false },
      opportunityScout: { canView: false },
      leads: { canView: false },
      jobs: { canView: true, canManageField: true, canManageAll: false },
      reports: { canCreate: true, canReview: false },
      uploads: { canCreate: true, canManageAll: false },
    },
    jobs: [{ id: "JOB-1", title: "Assigned job" }],
  });

  assert.equal(state.canView, false);
  assert.deepEqual(state.workflowCards, []);
  assert.deepEqual(state.focusRows, []);
  assert.deepEqual(state.tradeGuidance, []);
  assert.match(state.summary, /Field users stay limited/i);
});

test("AI Office agent command center surfaces trade-aware workflow guidance", () => {
  const fencingSummary = {
    primaryTradeId: "fencing",
    primaryTradeLabel: "Fencing",
    visibleTrades: [{ tradeId: "fencing", tradeLabel: "Fencing", count: 2 }],
    fieldHandoffChecklist: ["Confirm fence line", "Mark gates"],
    proofPhotoChecklist: ["Post hole layout", "Gate hardware"],
    changeOrderWatchouts: ["Added gates", "Fence length changes"],
    safetyBoundary: "Estimate-grade guidance only.",
  };
  const concreteSummary = {
    primaryTradeId: "concrete",
    primaryTradeLabel: "Concrete",
    visibleTrades: [{ tradeId: "concrete", tradeLabel: "Concrete", count: 1 }],
    fieldHandoffChecklist: ["Confirm subgrade", "Sawcut plan"],
    proofPhotoChecklist: ["Forms", "Finish photos"],
    changeOrderWatchouts: ["Extra demo"],
    safetyBoundary: "Estimate-grade guidance only.",
  };
  const state = deriveAiOfficeAgentCommandCenter({
    permissions: {
      aiOffice: { canView: true },
      leads: { canView: true },
      jobs: { canView: true, canManageAll: true },
      estimates: { canView: true, canManage: true },
      reports: { canView: true, canReview: true },
      uploads: { canView: true },
    },
    leads: [{ id: "LEAD-1", customer: "Fence GC", status: "New", trade: "fencing" }],
    jobs: [{ id: "JOB-1", title: "Fence install", status: "scheduled" }],
    estimates: [{ id: "EST-1", title: "Fence option", status: "draft" }],
    dailyReports: [{ id: "REPORT-1", status: "Submitted", jobTitle: "Fence install" }],
    uploads: [{ id: "UPLOAD-1", fileName: "post-hole.jpg" }],
    agentWorkflowContext: {
      modules: [
        { id: "leads", moduleId: "leads", canView: true, tradeSummary: fencingSummary },
        { id: "jobs", moduleId: "jobs", canView: true, tradeSummary: fencingSummary },
        { id: "estimates", moduleId: "estimates", canView: true, tradeSummary: concreteSummary },
        { id: "proof", moduleId: "reports", canView: true, tradeSummary: fencingSummary },
      ],
    },
  });

  const leadCard = state.workflowCards.find((card) => card.id === "lead-review");
  const estimateCard = state.workflowCards.find((card) => card.id === "estimate-action-agent");
  const proofCard = state.workflowCards.find((card) => card.id === "proof-closeout");
  const leadRow = state.focusRows.find((row) => row.recordType === "lead");
  const reportRow = state.focusRows.find((row) => row.recordType === "report");

  assert.equal(leadCard.tradeGuidance.label, "Fencing");
  assert.match(leadCard.tradeGuidance.detail, /Confirm fence line/i);
  assert.equal(estimateCard.tradeGuidance.label, "Concrete");
  assert.equal(proofCard.tradeGuidance.label, "Fencing");
  assert.match(proofCard.tradeGuidance.detail, /Post hole layout/i);
  assert.equal(leadRow.tradeSummary.primaryTradeId, "fencing");
  assert.equal(reportRow.tradeGuidance.label, "Fencing");
  assert.equal(state.tradeGuidance.length, 4);
});

test("AI Office agent command center keeps Premium assistant useful without Opportunity Scout controls", () => {
  const state = deriveAiOfficeAgentCommandCenter({
    permissions: {
      aiOffice: { canView: true },
      opportunityScout: { canView: false },
      leads: { canView: true },
      jobs: { canView: true, canManageAll: true },
      reports: { canView: true, canReview: true },
      uploads: { canView: true },
      fieldOps: { canView: true, canViewCompanyWide: true },
      support: { canView: true },
    },
    leads: [{ id: "LEAD-1", customer: "New GC", status: "New" }],
    jobs: [{ id: "JOB-1", title: "Startup job", status: "planned" }],
    dailyReports: [{ id: "REPORT-1", status: "Submitted", jobTitle: "Startup job" }],
    fieldOpsAgent: {
      canView: true,
      stats: { total: 0 },
      items: [],
    },
  });

  assert.equal(state.canView, true);
  assert.equal(state.workflowCards.some((card) => card.id === "opportunity-scout"), false);
  assert.equal(state.workflowCards.some((card) => card.id === "lead-review"), true);
  assert.equal(state.workflowCards.some((card) => card.id === "job-startup"), true);
  assert.equal(state.workflowCards.some((card) => card.id === "proof-closeout"), true);
  assert.equal(state.workflowCards.some((card) => card.id === "field-ops-agent"), true);
  assert.equal(state.focusRows.some((row) => row.recordType === "lead"), true);
});
