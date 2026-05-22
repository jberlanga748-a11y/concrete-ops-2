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
  assert.match(state.summary, /Field users stay limited/i);
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
