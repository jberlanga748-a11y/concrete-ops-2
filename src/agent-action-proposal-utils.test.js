import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAgentActionProposal,
  deriveAgentActionInbox,
  buildAgentActionProposalReviewAuditPayload,
  deriveAgentActionProposalQueue,
  deriveAgentActionProposalReviewState,
  deriveAgentActionProposalAuditHistory,
  normalizeAgentActionProposalAuditEvent,
  redactAgentProposalAuditText,
  validateAgentActionProposalSafety,
} from "./agent-action-proposal-utils.js";

test("agent action proposal wraps assistant route commands as review-first packets", () => {
  const proposal = buildAgentActionProposal({
    type: "estimate-job-handoff-review",
    moduleId: "estimates",
    actionLabel: "Open Estimates",
    message: "Review estimate-to-job handoff. No job is created automatically.",
    matches: [{ id: "estimate:1", label: "Gate proposal" }],
  }, {
    permissions: {
      aiOffice: { canView: true },
      estimates: { canView: true, canManage: true },
    },
  });

  assert.equal(proposal.mode, "review_first_action_proposal");
  assert.equal(proposal.status, "needs_human_review");
  assert.equal(proposal.approvalRequired, true);
  assert.equal(proposal.targetModuleId, "estimates");
  assert.equal(proposal.actionPolicy.actionClass, "prepare_job_handoff");
  assert.match(proposal.allowedNextStep, /review/i);
  assert.ok(proposal.reviewChecklist.some((item) => /matched item/i.test(item)));
  assert.ok(proposal.reviewChecklist.some((item) => /approved estimate before using the normal convert-to-job workflow/i.test(item)));
  assert.equal(proposal.draftPrep.length, 1);
  assert.equal(proposal.draftPrep[0].prepType, "Job handoff prep");
  assert.match(proposal.draftPrep[0].reviewLabel, /No job, schedule, crew assignment/i);
  assert.ok(proposal.blockedActions.some((item) => /No job, lead, or estimate conversion/i.test(item)));
  assert.equal(validateAgentActionProposalSafety(proposal).ok, true);
});

test("agent action proposal exposes estimate draft prep without saving a draft", () => {
  const proposal = buildAgentActionProposal({
    type: "estimate-draft-review",
    moduleId: "estimates",
    actionLabel: "Review draft in Estimates",
    message: "I found ABC Builders. Review before creating a Draft estimate.",
    query: "ABC Builders",
    roughNotes: "Demo old cedar fence and install 120 LF 6 ft cedar.",
    matches: [{
      id: "lead:LEAD-ABC",
      label: "ABC Builders - Fence replacement",
      helper: "Lead match - Salem",
    }],
  }, {
    permissions: {
      aiOffice: { canView: true },
      estimates: { canView: true, canManage: true },
    },
  });

  assert.equal(proposal.status, "needs_human_review");
  assert.equal(proposal.actionPolicy.actionClass, "create_draft");
  assert.equal(proposal.draftPrep.length, 1);
  assert.equal(proposal.draftPrep[0].prepType, "Estimate draft prep");
  assert.match(proposal.draftPrep[0].safeOutput, /Rough notes/i);
  assert.ok(proposal.draftPrep[0].fields.includes("Rough notes captured"));
  assert.ok(proposal.draftPrep[0].fieldPreview.some((row) => row.field === "Customer" && /ABC Builders/i.test(row.proposedValue)));
  assert.ok(proposal.draftPrep[0].fieldPreview.some((row) => row.field === "Rough notes" && /120 LF 6 ft cedar/i.test(row.proposedValue)));
  assert.ok(proposal.draftPrep[0].fieldPreview.some((row) => row.field === "Draft status" && /human approval/i.test(row.proposedValue)));
  assert.match(proposal.draftPrep[0].reviewLabel, /No estimate is saved/i);
  assert.equal(validateAgentActionProposalSafety(proposal).ok, true);
});

test("agent action proposal exposes workflow draft prep as review-only output", () => {
  const proposal = buildAgentActionProposal({
    type: "workflow-draft-prep",
    moduleId: "reports",
    actionLabel: "Open reports",
    message: "Prepare review notes. Nothing is saved.",
    draftPacket: {
      title: "Close proof gaps draft packet",
      summary: "Prepare review notes for Open reports.",
      target: { id: "next-proof", moduleId: "reports", actionLabel: "Open reports", title: "Close proof gaps" },
      items: [
        { label: "Context to review", detail: "Daily report submitted." },
        { label: "Human next step", detail: "Open reports and review proof." },
      ],
      blockedActions: ["No customer email, text, call, notification, bid submission, or proposal send"],
      safetyBoundary: "Draft prep only. Nothing is saved, sent, approved, converted, scheduled, invoiced, or changed.",
    },
  }, {
    permissions: {
      aiOffice: { canView: true },
      reports: { canView: true },
    },
  });

  assert.equal(proposal.status, "needs_human_review");
  assert.equal(proposal.typeLabel, "Workflow draft prep");
  assert.equal(proposal.draftPrep.length, 1);
  assert.equal(proposal.draftPrep[0].prepType, "Workflow draft prep");
  assert.match(proposal.draftPrep[0].safeOutput, /does not save/i);
  assert.ok(proposal.draftPrep[0].fieldPreview.some((row) => row.field === "Human next step" && /Open reports/i.test(row.proposedValue)));
  assert.ok(proposal.draftPrep[0].warnings.some((item) => /No customer email/i.test(item)));
  assert.equal(validateAgentActionProposalSafety(proposal).ok, true);
});

test("agent action proposal queue converts AI Office focus rows into review-first packets", () => {
  const queue = deriveAgentActionProposalQueue([
    {
      id: "lead-LEAD-1",
      moduleId: "leads",
      recordType: "lead",
      title: "Fence replacement lead",
      description: "Missing gate details before estimate prep.",
      actionLabel: "Open lead",
      record: { id: "LEAD-1", trade: "fencing" },
      tradeGuidance: { label: "Fencing" },
    },
    {
      id: "report-REPORT-1",
      moduleId: "reports",
      recordType: "report",
      title: "Fence daily report",
      description: "Submitted report needs office review.",
      actionLabel: "Open report",
      record: { id: "REPORT-1" },
    },
  ], {
    permissions: {
      aiOffice: { canView: true },
      leads: { canView: true },
      reports: { canView: true, canReview: true },
    },
    workflowContext: {
      source: "local",
      visibleModuleCount: 2,
      attentionCount: 2,
      modules: [
        {
          id: "leads",
          moduleId: "leads",
          label: "Leads",
          canView: true,
          summary: "1 lead needs review.",
          tradeSummary: {
            primaryTradeId: "fencing",
            primaryTradeLabel: "Fencing",
            proofPhotoChecklist: ["Gate hardware"],
            fieldHandoffChecklist: ["Confirm fence line"],
          },
        },
        {
          id: "proof",
          moduleId: "reports",
          label: "Proof Engine",
          canView: true,
          summary: "1 proof item needs review.",
        },
      ],
    },
  });

  assert.equal(queue.length, 2);
  assert.equal(queue[0].proposal.mode, "review_first_action_proposal");
  assert.equal(queue[0].proposal.proof.commandType, "lead-follow-up");
  assert.equal(queue[0].proposal.contextProof.module.tradeSummary.primaryTradeLabel, "Fencing");
  assert.equal(queue[0].tradeLabel, "Fencing");
  assert.equal(queue[1].proposal.proof.commandType, "report-review");
  assert.ok(queue[0].proposal.blockedActions.some((item) => /No customer email/i.test(item)));
  assert.equal(validateAgentActionProposalSafety(queue[0].proposal).ok, true);
});

test("agent action proposal queue blocks field-only users", () => {
  const queue = deriveAgentActionProposalQueue([
    {
      id: "lead-LEAD-1",
      moduleId: "leads",
      recordType: "lead",
      title: "Fence replacement lead",
      actionLabel: "Open lead",
      record: { id: "LEAD-1" },
    },
  ], {
    permissions: {
      jobs: { canManageField: true, canManageAll: false },
      leads: { canView: false },
      aiOffice: { canView: false },
      opportunityScout: { canView: false },
    },
  });

  assert.equal(queue.length, 1);
  assert.equal(queue[0].proposal.status, "blocked");
  assert.equal(queue[0].statusLabel, "Blocked");
  assert.equal(validateAgentActionProposalSafety(queue[0].proposal).ok, true);
});

test("agent action proposal review state is session-only and requires checklist completion", () => {
  const queue = deriveAgentActionProposalQueue([
    {
      id: "lead-LEAD-1",
      moduleId: "leads",
      recordType: "lead",
      title: "Fence replacement lead",
      description: "Missing gate details before estimate prep.",
      actionLabel: "Open lead",
      record: { id: "LEAD-1" },
    },
  ], {
    permissions: {
      aiOffice: { canView: true },
      leads: { canView: true },
    },
  });

  const initial = deriveAgentActionProposalReviewState(queue);
  assert.equal(initial.status, "needs_review");
  assert.equal(initial.canOpenWorkflow, true);
  assert.equal(initial.canMarkReviewed, false);
  assert.match(initial.safetyCopy, /Session-only review gate/i);
  assert.ok(initial.blockedActions.some((item) => /No customer email/i.test(item)));

  const completedChecklist = initial.checklist.map((item) => item.id);
  const ready = deriveAgentActionProposalReviewState(queue, {
    selectedId: queue[0].id,
    decisions: {
      [queue[0].id]: { completedChecklist },
    },
  });
  assert.equal(ready.status, "ready_to_open");
  assert.equal(ready.canMarkReviewed, true);

  const reviewed = deriveAgentActionProposalReviewState(queue, {
    selectedId: queue[0].id,
    decisions: {
      [queue[0].id]: { completedChecklist, reviewedAt: "2026-05-23T01:00:00.000Z" },
    },
  });
  assert.equal(reviewed.status, "reviewed_locally");
  assert.equal(reviewed.isLocallyReviewed, true);
});

test("agent action proposal review state stays blocked for field users", () => {
  const queue = deriveAgentActionProposalQueue([
    {
      id: "lead-LEAD-1",
      moduleId: "leads",
      recordType: "lead",
      title: "Fence replacement lead",
      actionLabel: "Open lead",
      record: { id: "LEAD-1" },
    },
  ], {
    permissions: {
      jobs: { canManageField: true, canManageAll: false },
      leads: { canView: false },
      aiOffice: { canView: false },
      opportunityScout: { canView: false },
    },
  });

  const state = deriveAgentActionProposalReviewState(queue);
  assert.equal(state.status, "blocked");
  assert.equal(state.canOpenWorkflow, false);
  assert.equal(state.canMarkReviewed, false);
  assert.match(state.safetyCopy, /blocked by role, package, or safety/i);
});

test("agent action inbox groups review packets and audit history into pilot statuses", () => {
  const queue = deriveAgentActionProposalQueue([
    {
      id: "lead-LEAD-1",
      moduleId: "leads",
      recordType: "lead",
      title: "Fence replacement lead",
      description: "Missing gate details before estimate prep.",
      actionLabel: "Open lead",
      record: { id: "LEAD-1" },
    },
    {
      id: "estimate-EST-1",
      moduleId: "estimates",
      recordType: "estimate",
      title: "Approved gate proposal",
      description: "Ready for handoff review.",
      actionLabel: "Open estimate",
      actionMode: "jobHandoff",
      record: { id: "EST-1", status: "approved" },
    },
  ], {
    permissions: {
      aiOffice: { canView: true },
      leads: { canView: true },
      estimates: { canView: true, canManage: true },
    },
  });
  const initialReview = deriveAgentActionProposalReviewState(queue);
  const readyReview = deriveAgentActionProposalReviewState(queue, {
    selectedId: queue[0].id,
    decisions: {
      [queue[0].id]: {
        completedChecklist: initialReview.checklist.map((item) => item.id),
        reviewedAt: "2026-05-23T06:00:00.000Z",
      },
    },
  });
  const auditHistory = deriveAgentActionProposalAuditHistory([
    {
      id: "AUDIT-APPROVED",
      entityType: "agentActionProposal",
      entityId: "agent-proposal:estimate-draft-review:estimates",
      action: "agent.proposal.approved_for_draft",
      summary: "Estimate draft prep approved",
      detail: JSON.stringify({ status: "approved_for_draft", proposalType: "estimate-draft-review", sourceModule: "estimates" }),
      actorName: "Jason M.",
      createdAt: "2026-05-23T06:05:00.000Z",
    },
    {
      id: "AUDIT-DRAFT",
      entityType: "agentActionProposal",
      entityId: "agent-proposal:estimate-draft-review:estimates",
      action: "agent.proposal.draft_created",
      summary: "Estimate draft created",
      detail: JSON.stringify({ status: "draft_created", proposalType: "estimate-draft-review", sourceModule: "estimates" }),
      actorName: "Jason M.",
      createdAt: "2026-05-23T06:10:00.000Z",
    },
  ], { canView: true, limit: 5 });

  const inbox = deriveAgentActionInbox({
    queue,
    reviewState: readyReview,
    auditHistory,
  });

  assert.equal(inbox.counts.ready_for_review, 1);
  assert.equal(inbox.counts.suggested, 1);
  assert.equal(inbox.counts.approved_for_draft, 1);
  assert.equal(inbox.counts.draft_created, 1);
  assert.equal(inbox.waitingCount, 3);
  assert.equal(inbox.completedCount, 1);
  assert.equal(inbox.recordedCount, 2);
  assert.equal(inbox.filters.find((filter) => filter.id === "waiting")?.count, 3);
  assert.equal(inbox.filters.find((filter) => filter.id === "recorded")?.count, 2);
  assert.equal(inbox.rowsByFilter.waiting.length, 3);
  assert.equal(inbox.rowsByFilter.recorded.length, 2);
  assert.ok(inbox.rows.some((row) => row.status === "approved_for_draft" && row.source === "audit"));
  assert.match(inbox.safetyCopy, /does not create drafts, send messages/i);
});

test("agent action inbox keeps field-user queue blocked", () => {
  const queue = deriveAgentActionProposalQueue([
    {
      id: "lead-LEAD-1",
      moduleId: "leads",
      recordType: "lead",
      title: "Fence replacement lead",
      actionLabel: "Open lead",
      record: { id: "LEAD-1" },
    },
  ], {
    permissions: {
      jobs: { canManageField: true, canManageAll: false },
      leads: { canView: false },
      aiOffice: { canView: false },
      opportunityScout: { canView: false },
    },
  });
  const reviewState = deriveAgentActionProposalReviewState(queue);
  const inbox = deriveAgentActionInbox({ queue, reviewState });

  assert.equal(inbox.counts.blocked, 1);
  assert.equal(inbox.blockedCount, 1);
  assert.equal(inbox.rows[0].isBlocked, true);
  assert.equal(inbox.rows[0].statusLabel, "Blocked");
  assert.equal(inbox.rowsByFilter.blocked.length, 1);
});

test("agent action inbox explains paused policy empty state", () => {
  const inbox = deriveAgentActionInbox({
    queue: [],
    reviewState: {},
    auditHistory: [],
    automationPolicy: { agentPaused: true, modeLabel: "Off" },
  });

  assert.equal(inbox.policyPaused, true);
  assert.equal(inbox.waitingCount, 0);
  assert.equal(inbox.recordedCount, 0);
  assert.match(inbox.summary, /paused by policy/i);
  assert.match(inbox.emptyStates.waiting.title, /paused by policy/i);
  assert.match(inbox.emptyStates.waiting.copy, /No customer sends, scheduling, billing, or record changes/i);
  assert.equal(inbox.filters.map((filter) => filter.id).join(","), "waiting,blocked,recorded");
});

test("agent action proposal review audit payload stays review-first and redacted", () => {
  const queue = deriveAgentActionProposalQueue([
    {
      id: "lead-LEAD-1",
      moduleId: "leads",
      recordType: "lead",
      title: "Fence replacement lead password=secret123",
      description: "Missing gate details before estimate prep. email bob@example.com",
      actionLabel: "Open lead",
      record: { id: "LEAD-1" },
    },
  ], {
    permissions: {
      aiOffice: { canView: true },
      leads: { canView: true },
    },
  });
  const initial = deriveAgentActionProposalReviewState(queue);
  const reviewed = deriveAgentActionProposalReviewState(queue, {
    selectedId: queue[0].id,
    decisions: {
      [queue[0].id]: {
        completedChecklist: initial.checklist.map((item) => item.id),
        reviewedAt: "2026-05-23T02:00:00.000Z",
      },
    },
  });

  const payload = buildAgentActionProposalReviewAuditPayload(reviewed, {
    actor: { id: "USER-1", role: "Administrator" },
  });

  assert.equal(payload.eventType, "agent.proposal.generated");
  assert.equal(payload.approvalRequired, true);
  assert.equal(payload.targetEntityType, "lead");
  assert.equal(payload.targetEntityId, "LEAD-1");
  assert.equal(payload.sourceRoute, "/ai-office");
  assert.doesNotMatch(JSON.stringify(payload), /secret123|bob@example\.com/i);
  assert.match(JSON.stringify(payload), /\[REDACTED\]/);
  assert.ok(payload.blockedReasons.some((item) => /No customer email/i.test(item)));
});

test("agent action proposal hydrates review packets with read-only server context", () => {
  const proposal = buildAgentActionProposal({
    type: "workflow-draft-prep",
    moduleId: "reports",
    actionLabel: "Open reports",
    message: "Prepare review notes. Nothing is saved.",
    draftPacket: {
      title: "Close proof gaps draft packet",
      summary: "Prepare review notes for Open reports.",
      target: { id: "next-proof", moduleId: "reports", actionLabel: "Open reports", title: "Close proof gaps" },
      items: [{ label: "Human next step", detail: "Open reports and review proof." }],
      blockedActions: ["No customer email, text, call, notification, bid submission, or proposal send"],
      safetyBoundary: "Draft prep only. Nothing is saved, sent, approved, converted, scheduled, invoiced, or changed.",
    },
  }, {
    permissions: {
      aiOffice: { canView: true },
      reports: { canView: true },
    },
    workflowContext: {
      source: "server",
      mode: "server_read_only_review_first",
      requestId: "REQ-123",
      generatedAt: "2026-05-22T05:00:00.000Z",
      visibleModuleCount: 4,
      attentionCount: 7,
      summary: "Server context shows proof gaps.",
      safetyBoundary: "Read-only server context. No records are changed.",
      modules: [{
        id: "proof",
        moduleId: "reports",
        label: "Proof Engine",
        canView: true,
        count: 12,
        needsAttention: 3,
        summary: "3 proof items need review.",
        nextActionLabel: "Open reports",
        tradeSummary: {
          primaryTradeId: "fencing",
          primaryTradeLabel: "Fencing",
          visibleTrades: [{ tradeId: "fencing", tradeLabel: "Fencing", count: 2 }],
          lineItemStarters: ["Fence line layout", "Post setting", "Gate hardware"],
          proposalSections: ["Linear footage", "Fence height", "Gate count and hardware"],
          fieldHandoffChecklist: ["Confirm fence line", "Confirm gate swings"],
          proofPhotoChecklist: ["Post holes", "Gate hardware"],
          changeOrderWatchouts: ["Rocky digging"],
          closeoutChecks: ["Installed LF vs estimate", "Gate count/hardware"],
          safetyBoundary: "Use this as review-only trade guidance. Do not invent pricing.",
        },
        records: [{ id: "REPORT-1", label: "Westview Daily Report", status: "Submitted" }],
      }],
      topActions: [{ moduleId: "reports", actionLabel: "Open reports", label: "Proof Engine", count: 3 }],
    },
  });

  assert.equal(proposal.contextProof.source, "server");
  assert.equal(proposal.contextProof.requestId, "REQ-123");
  assert.equal(proposal.contextProof.module.label, "Proof Engine");
  assert.equal(proposal.contextProof.module.tradeSummary.primaryTradeLabel, "Fencing");
  assert.equal(proposal.contextProof.module.records[0].label, "Westview Daily Report");
  assert.ok(proposal.reviewChecklist.some((item) => /synced server context/i.test(item)));
  assert.ok(proposal.draftPrep[0].fields.some((item) => /Context: server/i.test(item)));
  assert.ok(proposal.draftPrep[0].fields.some((item) => /Trade focus: Fencing/i.test(item)));
  assert.ok(proposal.draftPrep[0].fields.some((item) => /Estimate starters: Fence line layout, Post setting, Gate hardware/i.test(item)));
  assert.ok(proposal.draftPrep[0].fields.some((item) => /Proposal sections: Linear footage, Fence height, Gate count and hardware/i.test(item)));
  assert.ok(proposal.draftPrep[0].fields.some((item) => /Proof prompts: Post holes, Gate hardware/i.test(item)));
  assert.ok(proposal.draftPrep[0].fieldPreview.some((row) => row.field === "Trade estimate starters" && /Fence line layout/i.test(row.proposedValue)));
  assert.ok(proposal.draftPrep[0].fieldPreview.some((row) => row.field === "Trade proposal sections" && /Gate count/i.test(row.proposedValue)));
  assert.ok(proposal.draftPrep[0].fieldPreview.some((row) => row.field === "Trade proof prompts" && /Post holes/i.test(row.proposedValue)));
  assert.equal(validateAgentActionProposalSafety(proposal).ok, true);
});

test("agent action proposal treats daily ops briefs as auditable review packets", () => {
  const proposal = buildAgentActionProposal({
    type: "daily-ops-brief",
    moduleId: "reports",
    actionLabel: "Open reports",
    message: "Daily operations brief. Brief only. No records are saved, sent, approved, converted, scheduled, invoiced, billed, assigned, or updated.",
    brief: {
      title: "Daily operations brief",
      metrics: [{ label: "Review signals", value: 3 }],
    },
    actions: [{ moduleId: "reports", actionLabel: "Open reports" }],
  }, {
    permissions: {
      aiOffice: { canView: true },
      audit: { canView: true },
    },
  });
  const event = normalizeAgentActionProposalAuditEvent(proposal, {
    actor: { id: "USR-1", role: "Administrator" },
    prompt: "daily operations brief",
  });

  assert.equal(proposal.typeLabel, "Daily operations brief");
  assert.equal(proposal.status, "needs_human_review");
  assert.equal(validateAgentActionProposalSafety(proposal).ok, true);
  assert.equal(event.proposalType, "daily-ops-brief");
  assert.equal(event.approvalRequired, true);
  assert.ok(event.blockedReasons.some((item) => /No customer email/i.test(item)));
});

test("agent action proposal exposes closeout billing review packet without invoice actions", () => {
  const proposal = buildAgentActionProposal({
    type: "daily-closeout-readiness",
    moduleId: "reports",
    actionLabel: "Open Reports",
    message: "Daily closeout readiness is ready for office review. No billing action, invoice, customer message, or job status change happens automatically.",
    closeoutSummary: [{ id: "billing-candidates", label: "Billing review candidates", detail: "1 job still has closeout blockers." }],
    billingReviewPacket: {
      mode: "review_first_closeout_billing_packet",
      title: "Closeout billing review packet",
      summary: "1 closeout candidate reviewed. Start with Westview Warehouse.",
      summaryItems: [
        { id: "estimate-change-orders", label: "Estimate / change order review", detail: "$48,750 in linked estimate total is visible for office review." },
        { id: "proof-safety-blockers", label: "Proof / safety blockers", detail: "1 proof gap should be checked before billing is treated as clean." },
      ],
      rows: [
        { jobId: "JOB-1", title: "Westview Warehouse", readyForBillingReview: false, nextAction: "No reviewed daily report linked" },
      ],
      profitLossReviewItems: [
        { jobId: "JOB-1", title: "Westview Warehouse", readyForManualReview: false, nextStep: "No completed crew time is linked" },
      ],
      blockedActions: [
        "No invoice is created",
        "No payment is collected",
        "No customer email, text, call, or notification is sent",
      ],
      safetyBoundary: "Review-only closeout billing prep. Apex does not invoice, collect payment, contact customers, submit bills, change statuses, approve records, or finalize profit/loss from this packet.",
    },
  }, {
    permissions: {
      aiOffice: { canView: true },
      jobs: { canManageAll: true },
      reports: { canReview: true },
    },
  });

  assert.equal(proposal.status, "needs_human_review");
  assert.equal(proposal.typeLabel, "Daily closeout review");
  assert.equal(proposal.actionPolicy.actionClass, "prepare_closeout_review");
  assert.equal(proposal.draftPrep.length, 1);
  assert.equal(proposal.draftPrep[0].prepType, "Closeout billing review prep");
  assert.match(proposal.draftPrep[0].safeOutput, /Office review packet only/i);
  assert.ok(proposal.draftPrep[0].fields.some((item) => /profit\/loss prep/i.test(item)));
  assert.ok(proposal.draftPrep[0].fields.some((item) => /Westview Warehouse: No reviewed daily report linked/i.test(item)));
  assert.ok(proposal.draftPrep[0].fieldPreview.some((row) => row.field === "Billing action" && /Manual office review packet only/i.test(row.proposedValue)));
  assert.ok(proposal.draftPrep[0].warnings.some((item) => /No invoice is created/i.test(item)));
  assert.ok(proposal.blockedActions.some((item) => /No invoice, payment, package, or billing action/i.test(item)));
  assert.equal(validateAgentActionProposalSafety(proposal).ok, true);
});

test("agent action proposal treats package-locked assistant results as blocked", () => {
  const proposal = buildAgentActionProposal({
    type: "package-blocked",
    moduleId: "estimates",
    actionLabel: "Open Estimates",
    message: "Assistant rough-note estimate drafts require the Premium AI Rough Notes feature.",
  }, {
    permissions: { aiOffice: { canView: true } },
  });

  assert.equal(proposal.status, "blocked");
  assert.equal(proposal.tone, "red");
  assert.equal(proposal.typeLabel, "Package locked request");
  assert.equal(validateAgentActionProposalSafety(proposal).ok, true);
});

test("agent action proposal keeps blocked assistant requests blocked", () => {
  const proposal = buildAgentActionProposal({
    type: "blocked-command",
    moduleId: "estimates",
    actionLabel: "Open estimates",
    message: "I will not send customer messages automatically.",
  }, {
    permissions: { aiOffice: { canView: true } },
  });

  assert.equal(proposal.status, "blocked");
  assert.equal(proposal.tone, "red");
  assert.match(proposal.allowedNextStep, /manually/i);
  assert.ok(proposal.blockedActions.some((item) => /No outbound customer/i.test(item)));
  assert.equal(validateAgentActionProposalSafety(proposal).ok, true);
});

test("agent action proposal blocks field-only permission scopes", () => {
  const proposal = buildAgentActionProposal({
    type: "route",
    moduleId: "leads",
    actionLabel: "Open leads",
    message: "Open Leads to review follow-ups.",
  }, {
    permissions: {
      jobs: { canManageField: true, canManageAll: false },
      leads: { canView: false },
      aiOffice: { canView: false },
      opportunityScout: { canView: false },
    },
  });

  assert.equal(proposal.status, "blocked");
  assert.equal(proposal.approvalRequired, true);
  assert.equal(validateAgentActionProposalSafety(proposal).ok, true);
});

test("agent action proposal safety validator fails closed on unsafe packets", () => {
  const result = validateAgentActionProposalSafety({
    mode: "review_first_action_proposal",
    approvalRequired: false,
    allowedNextStep: "Send it now",
    blockedActions: [],
  });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => /approval/i.test(failure)));
  assert.ok(result.failures.some((failure) => /outbound/i.test(failure)));
});

test("agent proposal audit redaction removes secret-like payloads", () => {
  const redacted = redactAgentProposalAuditText(
    "Please use password: fence123 and bearer abcdefghijklmnop to submit the bid. Contact bob@example.com.",
  );

  assert.doesNotMatch(redacted, /fence123/);
  assert.doesNotMatch(redacted, /abcdefghijklmnop/);
  assert.doesNotMatch(redacted, /bob@example.com/i);
  assert.match(redacted, /\[REDACTED\]/);
});

test("agent proposal audit event normalizes review-first proposal metadata only", () => {
  const proposal = buildAgentActionProposal({
    type: "estimate-draft-review",
    moduleId: "estimates",
    actionLabel: "Review draft in Estimates",
    message: "Prepare rough notes only. Do not send or submit anything.",
    query: "Newco Builders",
    roughNotes: "Use token: secret-value and install 120 LF cedar.",
    matches: [{ id: "lead:1", label: "Newco Builders", helper: "Lead match" }],
  }, {
    permissions: { aiOffice: { canView: true }, estimates: { canView: true, canManage: true } },
  });

  const event = normalizeAgentActionProposalAuditEvent(proposal, {
    actor: { id: "USER-1", role: "Administrator" },
    sourceRoute: "/command-center",
    prompt: "Create estimate and email customer with api_key=123456",
    response: "No email is sent. Review only.",
    targetEntity: { type: "lead", id: "lead:1" },
  });

  assert.equal(event.eventType, "agent.proposal.generated");
  assert.equal(event.proposalId, proposal.id);
  assert.equal(event.actorUserId, "USER-1");
  assert.equal(event.sourceModule, "estimates");
  assert.equal(event.approvalRequired, true);
  assert.equal(event.safetyOk, true);
  assert.doesNotMatch(event.redactedPromptPreview, /123456/);
  assert.ok(event.blockedReasons.some((reason) => /Unsafe automation/i.test(reason)));
  assert.ok(event.blockedReasons.some((reason) => /Secret-like/i.test(reason)));
  assert.equal(event.draftPrepSummary.length, 1);
  assert.ok(event.draftPrepSummary[0].fieldPreview.some((row) => row.field === "Rough notes"));
  assert.equal(event.targetEntityType, "lead");
});

test("agent proposal audit event stays blocked for field-only users", () => {
  const proposal = buildAgentActionProposal({
    type: "lead-follow-up",
    moduleId: "leads",
    actionLabel: "Open Leads",
    message: "Follow up with this lead.",
    matches: [{ id: "lead:2", label: "Fence lead" }],
  }, {
    permissions: {
      jobs: { canManageField: true, canManageAll: false },
      leads: { canView: false },
      aiOffice: { canView: false },
      opportunityScout: { canView: false },
    },
  });

  const event = normalizeAgentActionProposalAuditEvent(proposal, {
    actor: { id: "FIELD-1", role: "Employee" },
    sourceRoute: "/jobs",
  });

  assert.equal(proposal.status, "blocked");
  assert.equal(event.eventType, "agent.proposal.blocked");
  assert.equal(event.status, "blocked");
  assert.equal(event.riskLevel, "review_required");
  assert.equal(event.actorRole, "Employee");
});

test("agent proposal audit history is read-only and permission gated", () => {
  const events = [
    {
      id: "AUDIT-1",
      entityType: "agentActionProposal",
      entityId: "agent-proposal:estimate",
      action: "agent.proposal.generated",
      summary: "Estimate draft review packet",
      actorName: "Demo Admin",
      createdAt: "2026-05-21T16:55:00.000Z",
      detail: JSON.stringify({
        proposalType: "estimate-draft-review",
        status: "needs_human_review",
        sourceModule: "estimates",
        requiredApprovals: ["Read the summary", "Use normal controls"],
        blockedReasons: ["No customer email, text, call, or notification"],
      }),
    },
    {
      id: "AUDIT-2",
      entityType: "estimate",
      action: "created",
      summary: "Estimate created",
    },
  ];

  assert.deepEqual(deriveAgentActionProposalAuditHistory(events, { canView: false }), []);
  const history = deriveAgentActionProposalAuditHistory(events, { canView: true });
  assert.equal(history.length, 1);
  assert.equal(history[0].id, "AUDIT-1");
  assert.equal(history[0].tone, "blue");
  assert.equal(history[0].sourceModule, "estimates");
  assert.equal(history[0].requiredApprovals.length, 2);
  assert.equal(history[0].blockedReasons.length, 1);
});
