import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveAgentNextBestActions,
  deriveAgentWorkflowContext,
  hasAgentNextBestActionsIntent,
  hasAgentWorkflowContextIntent,
} from "./agent-workflow-context-utils.js";

test("agent workflow context summarizes visible office workflow areas", () => {
  const context = deriveAgentWorkflowContext({
    user: { role: "Administrator" },
    permissions: {
      leads: { canView: true },
      estimates: { canView: true },
      jobs: { canView: true },
      reports: { canView: true },
      uploads: { canView: true },
      customers: { canView: true },
      users: { canView: true },
      time: { canView: true },
      safety: { canView: true },
      changeOrders: { canView: true },
      deliveryTickets: { canView: true },
      prePour: { canView: true },
      postPour: { canView: true },
      toolChecklist: { canUse: true },
      jobDraftImports: { canView: true },
    },
    leads: [{ id: "LEAD-1", customer: "Friendly Fence", status: "Follow Up" }],
    estimates: [{ id: "EST-1", title: "Fence Estimate", status: "Draft" }, { id: "EST-2", title: "Approved Fence", status: "Approved" }],
    jobs: [{ id: "JOB-1", title: "Fence Install", status: "In Progress" }],
    dailyReports: [{ id: "DR-1", title: "Daily", status: "Submitted" }],
    uploads: [{ id: "UP-1", title: "Photos", status: "Needs Review" }],
    customers: [{ id: "CUS-1", name: "Friendly Fence", status: "Active" }],
    users: [{ id: "USR-1", name: "Sam Foreman", status: "Active" }],
    timeEntries: [{ id: "TIME-1", clockIn: "2026-05-21T08:00:00Z", clockOut: "" }],
    safetyIncidents: [{ id: "SAFE-1", title: "Open hazard", status: "Open" }],
    changeOrderRequests: [{ id: "CO-1", title: "Gate change", status: "Pending" }],
    deliveryTickets: [{ id: "DT-1", title: "Materials", status: "Pending" }],
    prePourChecklists: [{ id: "PRE-1", title: "Prep", status: "Draft" }],
    postPourChecklists: [{ id: "POST-1", title: "Closeout", status: "Needs Review" }],
    toolChecklists: [{ id: "TOOL-1", title: "Tools", status: "Needs Review" }],
    jobDraftImports: [{ id: "IMP-1", title: "Imported package", status: "Ready" }],
  });

  assert.equal(context.mode, "read_only_review_first");
  assert.equal(context.userRole, "Administrator");
  assert.ok(context.visibleModuleCount >= 8);
  assert.ok(context.attentionCount > 0);
  assert.equal(context.modules.find((module) => module.id === "estimates").needsAttention, 2);
  assert.equal(context.modules.find((module) => module.id === "proof").needsAttention, 6);
  assert.equal(context.topActions[0].moduleId, "reports");
  assert.match(context.safetyBoundary, /No customer contact/i);
});

test("agent workflow context stays permission scoped for field users", () => {
  const context = deriveAgentWorkflowContext({
    user: { role: "Employee" },
    permissions: {
      jobs: { canView: true },
      uploads: { canView: true },
      reports: { canView: true },
      estimates: { canView: false },
      leads: { canView: false },
      customers: { canView: false },
    },
    jobs: [{ id: "JOB-1", title: "Assigned Fence", status: "Scheduled" }],
    estimates: [{ id: "EST-1", title: "Hidden Estimate", status: "Draft" }],
    leads: [{ id: "LEAD-1", customer: "Hidden Lead", status: "Follow Up" }],
  });

  assert.equal(context.modules.find((module) => module.id === "jobs").canView, true);
  assert.equal(context.modules.find((module) => module.id === "estimates").canView, false);
  assert.equal(context.modules.find((module) => module.id === "estimates").count, 0);
  assert.deepEqual(context.modules.find((module) => module.id === "estimates").records, []);
  assert.match(context.modules.find((module) => module.id === "leads").summary, /outside this user's/i);
});

test("agent workflow context intent recognizes operator prompts", () => {
  assert.equal(hasAgentWorkflowContextIntent("what should we do next?"), true);
  assert.equal(hasAgentWorkflowContextIntent("summarize workflow context"), true);
  assert.equal(hasAgentWorkflowContextIntent("open estimates"), false);
});

test("agent next best actions ranks visible review work without mutation", () => {
  const workflowContext = deriveAgentWorkflowContext({
    user: { role: "Administrator" },
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
    jobs: [{ id: "JOB-1", title: "Fence Install", status: "In Progress" }],
    dailyReports: [{ id: "DR-1", title: "Daily", status: "Submitted" }],
    uploads: [{ id: "UP-1", title: "Photos", status: "Needs Review" }],
    safetyIncidents: [{ id: "SAFE-1", title: "Open hazard", status: "Open" }],
  });

  const result = deriveAgentNextBestActions(workflowContext);

  assert.equal(result.mode, "review_first_next_actions");
  assert.equal(result.actions[0].moduleId, "incidents");
  assert.match(result.actions[0].blockedAutomation, /automatically/i);
  assert.equal(result.actions.some((action) => action.moduleId === "reports"), true);
  assert.match(result.safetyBoundary, /Suggestions only/i);
});

test("agent next best actions stay scoped to field-visible modules", () => {
  const result = deriveAgentNextBestActions({
    user: { role: "Employee" },
    permissions: {
      jobs: { canView: true },
      reports: { canView: true },
      uploads: { canView: true },
      leads: { canView: false },
      estimates: { canView: false },
    },
    jobs: [{ id: "JOB-1", title: "Assigned Fence", status: "Scheduled" }],
    leads: [{ id: "LEAD-1", customer: "Hidden Lead", status: "Follow Up" }],
    estimates: [{ id: "EST-1", title: "Hidden Estimate", status: "Draft" }],
  });

  assert.equal(result.actions.some((action) => action.moduleId === "leads"), false);
  assert.equal(result.actions.some((action) => action.moduleId === "estimates"), false);
  assert.equal(result.actions.some((action) => action.moduleId === "jobs"), true);
});

test("agent next best actions intent recognizes ranked operator prompts", () => {
  assert.equal(hasAgentNextBestActionsIntent("show next best actions"), true);
  assert.equal(hasAgentNextBestActionsIntent("what should we do now"), true);
  assert.equal(hasAgentNextBestActionsIntent("summarize workflow context"), false);
});
