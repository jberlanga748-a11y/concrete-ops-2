import { useEffect, useMemo, useState } from "react";

import { Badge, Button, Icon } from "./app-shell-components";
import { buildAgentActionProposal, buildAgentActionProposalReviewAuditPayload, deriveAgentActionInbox, deriveAgentActionProposalAuditHistory, deriveAgentActionProposalReviewState, normalizeAgentActionProposalAuditEvent } from "./agent-action-proposal-utils";
import { formatDateTime } from "./app-format-utils";
import { deriveApexAssistantShellState, resolveApexAssistantCommand } from "./apex-assistant-shell-utils";
import { APEX_BRAND_ASSETS } from "./brand-utils";

export function ApexAssistantShell({ permissions = {}, commandCenter = {}, agentCommandCenter = {}, commandContext = {}, agentContextState = { status: "idle", workflowContext: null, message: "" }, agentActionQueue = [], assistantCommandSeed = null, assistantOpenRequest = 0, showLauncher = true, onAssistantCommandSeedHandled = () => {}, onRefreshAgentContext = async () => null, onAskContractorAdvisor = async () => null, onOpenModule = () => {}, onStartEstimateDraft = () => {}, onCreateAgentEstimateDraft = async () => null, onPrepareAgentEstimateSend = async () => null, onExecuteAgentEstimateSend = async () => null, onConvertAgentEstimateToJob = async () => null, onOpenEstimatePacket = () => {}, onOpenEstimateJobHandoff = () => {}, onOpenJobHandoff = () => {}, onOpenReportReview = () => {}, onOpenUploadReview = () => {}, onOpenTimeReview = () => {}, onOpenChangeOrderReview = () => {}, onOpenLeadFollowUp = () => {}, onOpenCustomerAccount = () => {}, onOpenCrewReadiness = () => {}, onOpenScheduleDispatch = () => {}, onOpenImportedDraftReview = () => {}, onOpenSupportWorkflow = () => {}, onOpenDeliveryTicketReview = () => {}, onOpenPrePourReview = () => {}, onOpenPostPourReview = () => {}, onOpenSafetyIncidentReview = () => {}, onOpenToolChecklistReview = () => {}, onRecordAgentProposalAudit = async () => null }) {
  const assistantState = useMemo(() => deriveApexAssistantShellState({ permissions, commandCenter }), [commandCenter, permissions]);
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState(null);
  const [auditRecordState, setAuditRecordState] = useState({ proposalId: "", status: "idle", message: "" });
  const [draftActionState, setDraftActionState] = useState({ leadId: "", status: "idle", message: "" });
  const [sendReviewState, setSendReviewState] = useState({ estimateId: "", status: "idle", message: "" });
  const [jobDraftState, setJobDraftState] = useState({ estimateId: "", status: "idle", message: "" });
  const [selectedAgentProposalId, setSelectedAgentProposalId] = useState("");
  const [agentActionInboxFilter, setAgentActionInboxFilter] = useState("waiting");
  const [agentProposalReviewDecisions, setAgentProposalReviewDecisions] = useState({});
  const [agentProposalAuditState, setAgentProposalAuditState] = useState({ proposalId: "", status: "idle", message: "" });
  const [handledCommandSeedNonce, setHandledCommandSeedNonce] = useState(null);
  const agentAutomationPolicy = agentCommandCenter.automationPolicy || commandContext.agentCommandCenter?.automationPolicy || {};
  const emailExternalGate = agentAutomationPolicy.policy?.externalGateSettings?.email_send || agentAutomationPolicy.externalGateSettings?.email_send || {};
  const emailGateEnabled = emailExternalGate.enabled === true && emailExternalGate.mode === "human_confirmed";
  const actionProposal = useMemo(() => (
    response && !["contractor-advisor-answer", "contractor-advisor-loading", "contractor-advisor-error"].includes(response.type)
      ? buildAgentActionProposal(response, { permissions, workflowContext: commandContext.agentWorkflowContext })
      : null
  ), [commandContext.agentWorkflowContext, permissions, response]);
  const proposalAuditHistory = useMemo(() => (
    deriveAgentActionProposalAuditHistory(commandContext.auditEvents, {
      canView: Boolean(permissions.audit?.canView),
      limit: 4,
    })
  ), [commandContext.auditEvents, permissions.audit?.canView]);
  const actionProposalReview = useMemo(() => deriveAgentActionProposalReviewState(agentActionQueue, {
    selectedId: selectedAgentProposalId,
    decisions: agentProposalReviewDecisions,
  }), [agentActionQueue, agentProposalReviewDecisions, selectedAgentProposalId]);
  const agentActionInbox = useMemo(() => deriveAgentActionInbox({
    queue: agentActionQueue,
    reviewState: actionProposalReview,
    auditHistory: proposalAuditHistory,
    automationPolicy: agentAutomationPolicy,
    limit: 8,
  }), [agentActionQueue, actionProposalReview, agentAutomationPolicy, proposalAuditHistory]);
  const activeAgentActionFilter = agentActionInbox.filters.find((filter) => filter.id === agentActionInboxFilter) || agentActionInbox.filters[0];
  const filteredAgentActionRows = agentActionInbox.rowsByFilter?.[agentActionInboxFilter] || agentActionInbox.rows;
  const agentActionInboxEmpty = agentActionInbox.emptyStates?.[agentActionInboxFilter] || agentActionInbox.emptyStates?.waiting;
  const proposalAlreadyRecorded = Boolean(actionProposal?.id && (
    auditRecordState.proposalId === actionProposal.id && auditRecordState.status === "recorded"
    || proposalAuditHistory.some((event) => event.proposalId === actionProposal.id)
  ));
  const canRecordProposalAudit = Boolean(
    actionProposal
    && permissions.audit?.canView
    && actionProposal.approvalRequired
    && !proposalAlreadyRecorded
    && auditRecordState.status !== "saving",
  );
  const selectedAgentProposalAuditRecorded = Boolean(actionProposalReview.selected?.id && (
    agentProposalAuditState.proposalId === actionProposalReview.selected.id && agentProposalAuditState.status === "recorded"
    || proposalAuditHistory.some((event) => event.proposalId === actionProposalReview.selected?.proposal?.id)
  ));
  const usingServerAgentContext = Boolean(agentContextState.workflowContext?.source === "server");

  useEffect(() => {
    if (!open || !assistantState.canView || !permissions.aiOffice?.canView) return;
    if (agentContextState.status !== "idle") return;
    onRefreshAgentContext();
  }, [agentContextState.status, assistantState.canView, onRefreshAgentContext, open, permissions.aiOffice?.canView]);

  useEffect(() => {
    const nonce = assistantCommandSeed?.nonce;
    if (!nonce || handledCommandSeedNonce === nonce || !assistantState.canView) return;
    const commandText = assistantCommandSeed.commandText || "Review daily closeout and ready-to-bill proof chain";
    const result = resolveApexAssistantCommand(commandText, { ...assistantState, commandContext });
    setResponse(result);
    setPrompt("");
    setOpen(true);
    setHandledCommandSeedNonce(nonce);
    onAssistantCommandSeedHandled(nonce);
  }, [assistantCommandSeed?.nonce, assistantState, commandContext, handledCommandSeedNonce, onAssistantCommandSeedHandled]);

  useEffect(() => {
    if (!assistantOpenRequest || !assistantState.canView) return;
    setOpen(true);
  }, [assistantOpenRequest, assistantState.canView]);

  useEffect(() => {
    setAuditRecordState({ proposalId: actionProposal?.id || "", status: "idle", message: "" });
    setDraftActionState({ leadId: "", status: "idle", message: "" });
    setSendReviewState({ estimateId: "", status: "idle", message: "" });
    setJobDraftState({ estimateId: "", status: "idle", message: "" });
  }, [actionProposal?.id]);

  if (!assistantState.canView) return null;
  if (!open && !showLauncher) return null;

  function openModule(moduleId) {
    if (!moduleId) return;
    onOpenModule(moduleId);
    setOpen(false);
  }

  function seedFromAgentTarget(target = {}) {
    const record = target.record || {};
    return {
      id: record.id || target.recordId || target.id || "",
      estimateId: record.id || target.recordId || "",
      jobId: record.relatedJobId || record.jobId || record.id || "",
      leadId: record.leadId || record.id || "",
      reportId: record.reportId || record.id || "",
      uploadId: record.uploadId || record.id || "",
      timeEntryId: record.timeEntryId || record.id || "",
      changeOrderRequestId: record.changeOrderRequestId || record.requestId || record.id || "",
      requestId: record.changeOrderRequestId || record.requestId || record.id || "",
      safetyIncidentId: record.safetyIncidentId || record.incidentId || record.id || "",
      incidentId: record.safetyIncidentId || record.incidentId || record.id || "",
      importedDraftId: record.importedDraftId || record.id || "",
      label: target.title || record.title || record.customer || record.project || record.jobName || "Review item",
      helper: target.description || target.helper || record.nextStep || "Open the normal Apex HQ workflow and review before acting.",
      type: target.recordType || "",
      commandText: target.title || "",
    };
  }

  function openAgentActionTarget(target = {}) {
    const seed = seedFromAgentTarget(target);
    let opened = false;
    if (target.recordType === "estimate") {
      opened = target.actionMode === "jobHandoff" ? onOpenEstimateJobHandoff(seed) : onOpenEstimatePacket(seed);
    } else if (target.recordType === "lead" || target.recordType === "growthFollowUpDraft" || target.recordType === "growthSourceInsight") {
      opened = onOpenLeadFollowUp(seed);
    } else if (target.recordType === "job" || target.recordType === "growthReviewRequestDraft") {
      opened = onOpenJobHandoff(seed);
    } else if (target.recordType === "report" || target.recordType === "dailyCloseout") {
      opened = onOpenReportReview(seed);
    } else if (target.recordType === "upload") {
      opened = onOpenUploadReview(seed);
    } else if (target.recordType === "timeEntry") {
      opened = onOpenTimeReview(seed);
    } else if (target.recordType === "changeOrder") {
      opened = onOpenChangeOrderReview(seed);
    } else if (target.recordType === "safetyIncident") {
      opened = onOpenSafetyIncidentReview(seed);
    } else if (target.recordType === "draft") {
      opened = onOpenImportedDraftReview(seed);
    } else if (target.recordType === "agentLearning") {
      opened = onOpenSupportWorkflow({ ...seed, workflow: "Apex memory review" });
    } else if (target.recordType === "fieldOps") {
      openModule(target.moduleId || target.record?.moduleId || "commandCenter");
      return;
    }
    if (opened !== false) {
      setOpen(false);
      return;
    }
    openModule(target.moduleId || "commandCenter");
  }

  async function runPrompt(nextPrompt = prompt) {
    const result = resolveApexAssistantCommand(nextPrompt, { ...assistantState, commandContext });
    const question = String(nextPrompt || "").trim();
    if (question && result?.type === "safe-fallback" && permissions.aiOffice?.canView) {
      setResponse({
        type: "contractor-advisor-loading",
        moduleId: "commandCenter",
        actionLabel: "Open Command Center",
        message: "Apex Agent is reading the visible workspace context and thinking like a contractor operator...",
      });
      setPrompt("");
      try {
        const payload = await onAskContractorAdvisor({
          question,
          currentRoute: commandContext.currentRoute || "",
        });
        const advisor = payload?.contractorAdvisor || {};
        setResponse({
          type: "contractor-advisor-answer",
          moduleId: advisor.recommendedActions?.[0]?.moduleId || "commandCenter",
          actionLabel: advisor.recommendedActions?.[0]?.actionLabel || "Open workflow",
          message: advisor.message || advisor.answer || "Apex Agent prepared a contractor operating answer.",
          commandText: question,
          requestId: payload?.requestId || "",
          ...advisor,
        });
      } catch (error) {
        setResponse({
          type: "contractor-advisor-error",
          moduleId: "commandCenter",
          actionLabel: "Open Command Center",
          message: error?.message || "Apex Agent could not answer that contractor question right now.",
          commandText: question,
        });
      }
      return;
    }
    setResponse(result);
    setPrompt("");
  }

  function handleSubmit(event) {
    event.preventDefault();
    runPrompt(prompt);
  }

  async function recordCurrentProposalAudit() {
    if (!actionProposal || !permissions.audit?.canView || auditRecordState.status === "saving") return;
    const payload = normalizeAgentActionProposalAuditEvent(actionProposal, {
      actor: commandContext.user,
      sourceRoute: commandContext.currentRoute,
      sourceModule: actionProposal.targetModuleId,
      prompt: actionProposal.proof?.commandText || "",
      response: actionProposal.proof?.message || response?.message || "",
      status: actionProposal.status,
    });
    setAuditRecordState({ proposalId: actionProposal.id, status: "saving", message: "Recording review-first audit..." });
    try {
      await onRecordAgentProposalAudit(payload);
      setAuditRecordState({ proposalId: actionProposal.id, status: "recorded", message: "Recorded to the audit trail." });
    } catch (error) {
      setAuditRecordState({
        proposalId: actionProposal.id,
        status: "error",
        message: error?.message || "Could not record this proposal audit.",
      });
    }
  }

  function toggleAgentProposalReviewCheck(checkId) {
    const selectedId = actionProposalReview.selected?.id;
    if (!selectedId || !checkId || actionProposalReview.isBlocked) return;
    setAgentProposalReviewDecisions((current) => {
      const existing = current[selectedId] || {};
      const completed = new Set(Array.isArray(existing.completedChecklist) ? existing.completedChecklist : []);
      if (completed.has(checkId)) {
        completed.delete(checkId);
      } else {
        completed.add(checkId);
      }
      return {
        ...current,
        [selectedId]: {
          ...existing,
          completedChecklist: Array.from(completed),
          reviewedAt: "",
        },
      };
    });
    setAgentProposalAuditState((current) => (
      current.proposalId === selectedId ? { proposalId: selectedId, status: "idle", message: "" } : current
    ));
  }

  function markAgentProposalReviewedLocally() {
    const selectedId = actionProposalReview.selected?.id;
    if (!selectedId || !actionProposalReview.canMarkReviewed) return;
    setAgentProposalReviewDecisions((current) => ({
      ...current,
      [selectedId]: {
        ...(current[selectedId] || {}),
        completedChecklist: actionProposalReview.checklist.map((item) => item.id),
        reviewedAt: new Date().toISOString(),
      },
    }));
  }

  async function recordSelectedAgentProposalAudit() {
    const selected = actionProposalReview.selected;
    if (!selected?.id || agentProposalAuditState.status === "saving") return;
    if (!actionProposalReview.isBlocked && !actionProposalReview.isLocallyReviewed) return;
    const payload = buildAgentActionProposalReviewAuditPayload(actionProposalReview, {
      actor: commandContext.user,
      sourceRoute: commandContext.currentRoute || "/assistant",
    });
    if (!payload) return;
    setAgentProposalAuditState({ proposalId: selected.id, status: "saving", message: "Recording review-first audit..." });
    try {
      await onRecordAgentProposalAudit(payload);
      setAgentProposalAuditState({ proposalId: selected.id, status: "recorded", message: "Recorded to the audit trail." });
    } catch (error) {
      setAgentProposalAuditState({
        proposalId: selected.id,
        status: "error",
        message: error?.message || "Could not record this proposal audit.",
      });
    }
  }

  async function approveAndCreateEstimateDraft(match = {}) {
    if (!actionProposal || actionProposal.proof?.commandType !== "estimate-draft-review" || match.type !== "lead" || !match.leadId) return;
    if (!permissions.estimates?.canManage || draftActionState.status === "saving") return;
    const proposal = normalizeAgentActionProposalAuditEvent(actionProposal, {
      actor: commandContext.user,
      sourceRoute: commandContext.currentRoute,
      sourceModule: actionProposal.targetModuleId,
      prompt: actionProposal.proof?.commandText || "",
      response: actionProposal.proof?.message || response?.message || "",
      targetEntity: { type: "lead", id: match.leadId },
    });
    setDraftActionState({ leadId: match.leadId, status: "saving", message: "Approving and creating a draft estimate..." });
    try {
      const created = await onCreateAgentEstimateDraft({ proposal, leadId: match.leadId });
      setDraftActionState({
        leadId: match.leadId,
        status: "created",
        message: created?.id ? "Draft estimate created. No proposal was sent." : "Draft estimate is ready. No proposal was sent.",
      });
      setOpen(false);
      setResponse(null);
    } catch (error) {
      setDraftActionState({
        leadId: match.leadId,
        status: "error",
        message: error?.message || "Could not create this draft estimate.",
      });
    }
  }

  async function prepareEstimateSendReview(match = {}) {
    if (!actionProposal || actionProposal.proof?.commandType !== "estimate-packet-review" || match.type !== "estimate" || !match.estimateId) return;
    if (!permissions.estimates?.canManage || sendReviewState.status === "saving") return;
    const proposal = normalizeAgentActionProposalAuditEvent(actionProposal, {
      actor: commandContext.user,
      sourceRoute: commandContext.currentRoute,
      sourceModule: actionProposal.targetModuleId,
      prompt: actionProposal.proof?.commandText || "",
      response: actionProposal.proof?.message || response?.message || "",
      targetEntity: { type: "estimate", id: match.estimateId },
    });
    setSendReviewState({ estimateId: match.estimateId, status: "saving", message: "Preparing send review..." });
    try {
      await onPrepareAgentEstimateSend({ proposal, estimateId: match.estimateId });
      setSendReviewState({
        estimateId: match.estimateId,
        status: "ready",
        message: "Send review prepared. Use the normal Estimates send/copy controls after final review.",
      });
    } catch (error) {
      setSendReviewState({
        estimateId: match.estimateId,
        status: "error",
        message: error?.message || "Could not prepare send review.",
      });
    }
  }

  async function executeEstimateSendFromGate(match = {}) {
    if (!actionProposal || actionProposal.proof?.commandType !== "estimate-packet-review" || match.type !== "estimate" || !match.estimateId) return;
    if (!permissions.estimates?.canManage || !emailGateEnabled || sendReviewState.status === "sending") return;
    const proposal = normalizeAgentActionProposalAuditEvent(actionProposal, {
      actor: commandContext.user,
      sourceRoute: commandContext.currentRoute,
      sourceModule: actionProposal.targetModuleId,
      prompt: actionProposal.proof?.commandText || "",
      response: actionProposal.proof?.message || response?.message || "",
      targetEntity: { type: "estimate", id: match.estimateId },
    });
    setSendReviewState({ estimateId: match.estimateId, status: "sending", message: "Sending customer email through the approved Agent gate..." });
    try {
      const sent = await onExecuteAgentEstimateSend({
        proposal,
        estimateId: match.estimateId,
        reviewConfirmed: true,
        customerContactConfirmed: true,
        externalGateConfirmed: true,
      });
      setSendReviewState({
        estimateId: match.estimateId,
        status: "sent",
        message: sent?.providerMessageId ? "Customer email sent from the human-confirmed Agent gate." : "Customer email sent from the human-confirmed Agent gate.",
      });
    } catch (error) {
      setSendReviewState({
        estimateId: match.estimateId,
        status: "error",
        message: error?.message || "Could not send from the approved Agent email gate.",
      });
    }
  }

  async function approveAndCreateJobDraft(match = {}) {
    if (!actionProposal || actionProposal.proof?.commandType !== "estimate-job-handoff-review" || match.type !== "estimate" || !match.estimateId) return;
    if (!permissions.estimates?.canManage || !permissions.jobs?.canCreate || jobDraftState.status === "saving") return;
    const proposal = normalizeAgentActionProposalAuditEvent(actionProposal, {
      actor: commandContext.user,
      sourceRoute: commandContext.currentRoute,
      sourceModule: actionProposal.targetModuleId,
      prompt: actionProposal.proof?.commandText || "",
      response: actionProposal.proof?.message || response?.message || "",
      targetEntity: { type: "estimate", id: match.estimateId },
    });
    const approvedProposal = {
      ...proposal,
      eventType: "agent.proposal.approved_for_draft",
      status: "approved_for_draft",
      summary: "Job draft approved for agent estimate handoff",
      requiredApprovals: [
        ...new Set([
          ...(proposal.requiredApprovals || []),
          "Human owner/admin/estimator approved draft job creation from this estimate handoff.",
        ]),
      ],
      blockedReasons: [
        ...new Set([
          ...(proposal.blockedReasons || []),
          "No schedule, crew assignment, field visibility, customer contact, invoice, payment, or billing action was created.",
        ]),
      ],
    };
    setJobDraftState({ estimateId: match.estimateId, status: "saving", message: "Recording approval and creating a draft job..." });
    try {
      await onRecordAgentProposalAudit(proposal);
      await onRecordAgentProposalAudit(approvedProposal);
      const created = await onConvertAgentEstimateToJob({ proposal, estimateId: match.estimateId });
      setJobDraftState({
        estimateId: match.estimateId,
        status: "created",
        message: created?.id ? "Draft job created. No schedule, crew, send, invoice, or field update happened." : "Draft job is ready for office review.",
      });
      setOpen(false);
      setResponse(null);
    } catch (error) {
      setJobDraftState({
        estimateId: match.estimateId,
        status: "error",
        message: error?.message || "Could not create this draft job.",
      });
    }
  }

  function startEstimateDraft(choice = {}) {
    const payload = {
      ...choice,
      roughNotes: response?.roughNotes || choice.roughNotes || "",
      commandText: response?.commandText || "",
    };
    const started = onStartEstimateDraft(payload);
    if (started !== false) {
      setOpen(false);
      setResponse(null);
    }
  }

  function openEstimatePacket(choice = {}) {
    const opened = onOpenEstimatePacket(choice);
    if (opened !== false) {
      setOpen(false);
      setResponse(null);
    }
  }

  function openEstimateJobHandoff(choice = {}) {
    const opened = onOpenEstimateJobHandoff(choice);
    if (opened !== false) {
      setOpen(false);
      setResponse(null);
    }
  }

  function openJobHandoff(choice = {}) {
    const opened = onOpenJobHandoff(choice);
    if (opened !== false) {
      setOpen(false);
      setResponse(null);
    }
  }

  function openReportReview(choice = {}) {
    const opened = onOpenReportReview(choice);
    if (opened !== false) {
      setOpen(false);
      setResponse(null);
    }
  }

  function openUploadReview(choice = {}) {
    const opened = onOpenUploadReview(choice);
    if (opened !== false) {
      setOpen(false);
      setResponse(null);
    }
  }

  function openTimeReview(choice = {}) {
    const opened = onOpenTimeReview(choice);
    if (opened !== false) {
      setOpen(false);
      setResponse(null);
    }
  }

  function openChangeOrderReview(choice = {}) {
    const opened = onOpenChangeOrderReview(choice);
    if (opened !== false) {
      setOpen(false);
      setResponse(null);
    }
  }

  function openLeadFollowUp(choice = {}) {
    const opened = onOpenLeadFollowUp(choice);
    if (opened !== false) {
      setOpen(false);
      setResponse(null);
    }
  }

  function openCustomerAccount(choice = {}) {
    const opened = onOpenCustomerAccount(choice);
    if (opened !== false) {
      setOpen(false);
      setResponse(null);
    }
  }

  function openCrewReadiness(choice = {}) {
    const opened = onOpenCrewReadiness(choice);
    if (opened !== false) {
      setOpen(false);
      setResponse(null);
    }
  }

  function openScheduleDispatch(choice = {}) {
    const opened = onOpenScheduleDispatch(choice);
    if (opened !== false) {
      setOpen(false);
      setResponse(null);
    }
  }

  function openImportedDraftReview(choice = {}) {
    const opened = onOpenImportedDraftReview(choice);
    if (opened !== false) {
      setOpen(false);
      setResponse(null);
    }
  }

  function openSupportWorkflow(choice = {}) {
    const opened = onOpenSupportWorkflow(choice);
    if (opened !== false) {
      setOpen(false);
      setResponse(null);
    }
  }

  function openDeliveryTicketReview(choice = {}) {
    const opened = onOpenDeliveryTicketReview(choice);
    if (opened !== false) {
      setOpen(false);
      setResponse(null);
    }
  }

  function openPrePourReview(choice = {}) {
    const opened = onOpenPrePourReview(choice);
    if (opened !== false) {
      setOpen(false);
      setResponse(null);
    }
  }

  function openPostPourReview(choice = {}) {
    const opened = onOpenPostPourReview(choice);
    if (opened !== false) {
      setOpen(false);
      setResponse(null);
    }
  }

  function openSafetyIncidentReview(choice = {}) {
    const opened = onOpenSafetyIncidentReview(choice);
    if (opened !== false) {
      setOpen(false);
      setResponse(null);
    }
  }

  function openToolChecklistReview(choice = {}) {
    const opened = onOpenToolChecklistReview(choice);
    if (opened !== false) {
      setOpen(false);
      setResponse(null);
    }
  }

  return (
    <div className={`co-apex-assistant-shell ${open ? "is-open" : "is-closed"} fixed bottom-[5.75rem] right-3 z-40 w-[min(26rem,calc(100vw-1.5rem))] lg:bottom-5 lg:right-5`}>
      {open ? (
        <div className="co-apex-assistant-panel overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 text-white shadow-[0_28px_90px_-35px_rgba(2,6,23,0.88)]">
          <div className="co-apex-assistant-head border-b border-white/10 bg-slate-900/95 p-4">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="co-apex-assistant-logo-tile inline-flex h-10 w-10 items-center justify-center rounded-2xl">
                    <img src={APEX_BRAND_ASSETS.appMark} alt="" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-white">Apex Assistant</p>
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-orange-200">{assistantState.modeLabel}</p>
                  </div>
                </div>
              </div>
              <button type="button" className="co-apex-assistant-close co-focus-ring rounded-full border border-white/10 px-3 py-1 text-xs font-black text-slate-200 hover:bg-white/10" onClick={() => setOpen(false)} aria-label="Close Apex Assistant">
                Close
              </button>
            </div>
            <div className="co-apex-assistant-status-card mt-3 rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="flex min-w-0 items-start justify-between gap-2">
                <p className="text-sm font-black text-white">{assistantState.statusLabel}</p>
                <Badge tone={assistantState.statusLabel === "Operations clear" ? "green" : "amber"}>{assistantState.watchtowerQueue.length || assistantState.watchtowerActions.length}</Badge>
              </div>
              <p className="mt-1 text-xs font-bold leading-5 text-slate-300">{assistantState.summary}</p>
              {permissions.aiOffice?.canView ? (
                <div className="mt-3 flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Server context</p>
                    <p className="mt-1 text-xs font-bold leading-5 text-slate-300">
                      {agentContextState.status === "loading"
                        ? "Refreshing read-only agent context..."
                        : agentContextState.status === "error"
                          ? agentContextState.message || "Server context is unavailable."
                          : usingServerAgentContext
                            ? `Synced ${agentContextState.workflowContext.visibleModuleCount || 0} areas from API.`
                            : "Using local workspace context until server context is refreshed."}
                    </p>
                  </div>
                  <Button type="button" size="sm" variant="secondary" onClick={onRefreshAgentContext} disabled={agentContextState.status === "loading"}>
                    {agentContextState.status === "loading" ? "Syncing..." : usingServerAgentContext ? "Refresh" : "Sync"}
                  </Button>
                </div>
              ) : null}
            </div>
          </div>

          <div className="co-apex-assistant-body flex max-h-[62vh] flex-col overflow-y-auto p-4">
            {assistantState.watchtowerQueue.length ? (
              <div className="grid gap-2">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Watchtower context</p>
                {assistantState.watchtowerQueue.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openModule(item.moduleId)}
                    className="co-apex-assistant-context-card co-focus-ring w-full rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-left transition hover:border-orange-400/50 hover:bg-orange-500/10"
                  >
                    <span className="flex min-w-0 items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block break-words text-sm font-black text-white">{item.title}</span>
                        <span className="mt-1 block break-words text-xs font-bold leading-5 text-slate-300">{item.description}</span>
                      </span>
                      <span className="shrink-0 rounded-lg bg-white/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-slate-200">{item.sourceLabel || "Review"}</span>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm font-bold text-emerald-100">
                Watchtower has no urgent owner actions right now.
              </div>
            )}

            <div className="order-first mb-4 rounded-2xl border border-white/10 bg-white/[0.06] p-3">
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-200">Agent action inbox</p>
                  <p className="mt-1 text-sm font-black text-white">{agentActionInbox.summary}</p>
                  <p className="mt-1 text-xs font-bold leading-5 text-slate-300">{agentActionInbox.safetyCopy}</p>
                </div>
                <Badge tone={activeAgentActionFilter?.tone || "amber"}>{activeAgentActionFilter?.count || 0} {(activeAgentActionFilter?.label || "Waiting").toLowerCase()}</Badge>
              </div>
              {agentActionInbox.policyPaused ? (
                <div className="mt-3 rounded-xl border border-amber-300/25 bg-amber-500/10 p-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-100">Policy paused</p>
                  <p className="mt-1 text-[11px] font-bold leading-4 text-amber-50">Apex Agent review surfaces are off for this contractor. The Assistant can show saved history, but it will not surface new packets or start drafts.</p>
                </div>
              ) : null}
              <div className="mt-3 grid grid-cols-3 gap-2" role="tablist" aria-label="Agent action inbox filters">
                {agentActionInbox.filters.map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    role="tab"
                    aria-selected={agentActionInboxFilter === filter.id}
                    className={`co-focus-ring rounded-xl border p-2 text-left transition ${agentActionInboxFilter === filter.id ? "border-orange-300 bg-orange-500/15" : "border-white/10 bg-slate-950/40 hover:border-orange-400/50 hover:bg-orange-500/10"}`}
                    onClick={() => setAgentActionInboxFilter(filter.id)}
                  >
                    <span className="block text-base font-black text-white">{filter.count}</span>
                    <span className="mt-1 block text-[10px] font-black uppercase tracking-[0.08em] text-slate-400">{filter.label}</span>
                  </button>
                ))}
              </div>
              <div className="mt-3 grid gap-2">
                {filteredAgentActionRows.length ? filteredAgentActionRows.slice(0, 4).map((row) => (
                  row.source === "queue" ? (
                    <button
                      key={`${row.source}-${row.id}`}
                      type="button"
                      className={`co-focus-ring rounded-xl border p-2 text-left transition hover:border-orange-400/50 hover:bg-orange-500/10 ${row.isSelected ? "border-orange-300/70 bg-orange-500/15" : "border-white/10 bg-white/[0.05]"}`}
                      onClick={() => setSelectedAgentProposalId(row.id)}
                    >
                      <span className="flex min-w-0 items-start justify-between gap-2">
                        <span className="min-w-0">
                          <span className="block break-words text-xs font-black text-white">{row.title}</span>
                          <span className="mt-1 block break-words text-[11px] font-bold leading-4 text-slate-300">{row.helper}</span>
                        </span>
                        <span className="shrink-0 rounded-lg bg-white/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-slate-200">{row.statusLabel}</span>
                      </span>
                    </button>
                  ) : (
                    <div key={`${row.source}-${row.id}`} className="rounded-xl border border-white/10 bg-slate-950/40 p-2">
                      <span className="flex min-w-0 items-start justify-between gap-2">
                        <span className="min-w-0">
                          <span className="block break-words text-xs font-black text-white">{row.title}</span>
                          <span className="mt-1 block break-words text-[11px] font-bold leading-4 text-slate-300">{row.helper}</span>
                        </span>
                        <span className="shrink-0 rounded-lg bg-white/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-slate-200">{row.statusLabel}</span>
                      </span>
                    </div>
                  )
                )) : (
                  <div className="rounded-xl border border-white/10 bg-slate-950/40 p-2">
                    <p className="text-xs font-black text-white">{agentActionInboxEmpty?.title || "No agent action packets."}</p>
                    <p className="mt-1 text-[11px] font-bold leading-4 text-slate-300">{agentActionInboxEmpty?.copy || "Review-first work will appear here in the Assistant."}</p>
                  </div>
                )}
              </div>
              {actionProposalReview.selected ? (
                <div className="mt-3 rounded-2xl border border-orange-300/20 bg-orange-500/10 p-3">
                  <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-100">Review gate</p>
                      <p className="mt-1 break-words text-sm font-black text-white">{actionProposalReview.selected.sourceTitle}</p>
                    </div>
                    <Badge tone={actionProposalReview.isBlocked ? "red" : actionProposalReview.isLocallyReviewed ? "green" : "amber"}>
                      {actionProposalReview.statusLabel}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs font-bold leading-5 text-slate-300">{actionProposalReview.safetyCopy}</p>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <span className="rounded-xl border border-white/10 bg-slate-950/40 p-2">
                      <span className="block text-sm font-black text-white">{actionProposalReview.completedCount}/{actionProposalReview.totalCount}</span>
                      <span className="mt-1 block text-[10px] font-black uppercase tracking-[0.08em] text-slate-400">Checks</span>
                    </span>
                    <span className="rounded-xl border border-white/10 bg-slate-950/40 p-2">
                      <span className="block text-sm font-black text-white">{actionProposalReview.draftPrep.length}</span>
                      <span className="mt-1 block text-[10px] font-black uppercase tracking-[0.08em] text-slate-400">Draft prep</span>
                    </span>
                    <span className="rounded-xl border border-white/10 bg-slate-950/40 p-2">
                      <span className="block text-sm font-black text-white">{actionProposalReview.blockedActions.length}</span>
                      <span className="mt-1 block text-[10px] font-black uppercase tracking-[0.08em] text-slate-400">Locked</span>
                    </span>
                  </div>
                  <details className="mt-3 rounded-xl border border-white/10 bg-slate-950/40 p-2">
                    <summary className="co-focus-ring cursor-pointer rounded-lg px-1 py-1 text-xs font-black uppercase tracking-[0.08em] text-slate-100">
                      Review checklist
                    </summary>
                    <div className="mt-2 grid gap-2">
                      {actionProposalReview.checklist.slice(0, 6).map((check) => (
                        <button
                          key={check.id}
                          type="button"
                          className="co-focus-ring flex min-w-0 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] p-2 text-left text-xs font-bold leading-4 text-slate-200 transition hover:border-orange-400/50 hover:bg-orange-500/10 disabled:cursor-not-allowed disabled:opacity-70"
                          onClick={() => toggleAgentProposalReviewCheck(check.id)}
                          disabled={actionProposalReview.isBlocked}
                        >
                          <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[9px] font-black ${check.complete ? "border-emerald-300 bg-emerald-500/20 text-emerald-100" : "border-white/20 bg-slate-950/50 text-slate-500"}`}>{check.complete ? "OK" : ""}</span>
                          <span className="min-w-0 break-words">{check.label}</span>
                        </button>
                      ))}
                    </div>
                  </details>
                  {actionProposalReview.draftPrep.length ? (
                    <div className="mt-3 rounded-xl border border-blue-300/20 bg-blue-500/10 p-2">
                      {actionProposalReview.draftPrep.slice(0, 1).map((item) => (
                        <div key={item.id}>
                          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-100">{item.prepType}</p>
                          <p className="mt-1 text-xs font-black text-white">{item.label}</p>
                          <p className="mt-1 text-[11px] font-bold leading-4 text-blue-100">{item.safeOutput}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-1">
                    {actionProposalReview.blockedActions.slice(0, 3).map((item) => (
                      <span key={item} className="rounded-lg bg-red-500/15 px-2 py-1 text-[10px] font-black uppercase tracking-[0.06em] text-red-100">{item}</span>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="secondary" onClick={markAgentProposalReviewedLocally} disabled={!actionProposalReview.canMarkReviewed || actionProposalReview.isLocallyReviewed}>
                      {actionProposalReview.isLocallyReviewed ? "Reviewed" : `Review checks ${actionProposalReview.completedCount}/${actionProposalReview.totalCount}`}
                    </Button>
                    <Button type="button" size="sm" variant="secondary" onClick={recordSelectedAgentProposalAudit} disabled={agentProposalAuditState.status === "saving" || selectedAgentProposalAuditRecorded || (!actionProposalReview.isBlocked && !actionProposalReview.isLocallyReviewed)}>
                      {agentProposalAuditState.status === "saving" ? "Recording..." : selectedAgentProposalAuditRecorded ? "Audit recorded" : "Record audit"}
                    </Button>
                    <Button type="button" size="sm" onClick={() => openAgentActionTarget(actionProposalReview.selected?.target)} disabled={!actionProposalReview.canOpenWorkflow}>
                      Open workflow
                    </Button>
                  </div>
                  {agentProposalAuditState.proposalId === actionProposalReview.selected.id && agentProposalAuditState.message ? (
                    <p className={`mt-2 text-[11px] font-bold leading-4 ${agentProposalAuditState.status === "error" ? "text-red-100" : "text-blue-100"}`}>
                      {agentProposalAuditState.message}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {assistantState.prompts.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => runPrompt(item)}
                  className="co-apex-assistant-prompt co-focus-ring min-h-10 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2 text-left text-xs font-black leading-4 text-slate-100 transition hover:border-orange-400/50 hover:bg-orange-500/10"
                >
                  {item}
                </button>
              ))}
            </div>

            {response ? (
              <div className="co-apex-assistant-response mt-4 rounded-2xl border border-orange-400/30 bg-orange-500/10 p-3">
                <p className="text-sm font-black text-white">{response.message}</p>
                {actionProposal ? (
                  <div className="mt-3 rounded-2xl border border-white/10 bg-slate-950/70 p-3">
                    <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-200">Agent Action Proposal</p>
                        <p className="mt-1 break-words text-sm font-black text-white">{actionProposal.title}</p>
                      </div>
                      <Badge tone={actionProposal.status === "blocked" ? "red" : actionProposal.tone}>
                        {actionProposal.status === "blocked" ? "Blocked" : "Review first"}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs font-bold leading-5 text-slate-300">{actionProposal.allowedNextStep}</p>
                    {actionProposal.contextProof ? (
                      <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.05] p-2">
                        <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Context proof</p>
                            <p className="mt-1 text-xs font-bold leading-5 text-slate-300">
                              {actionProposal.contextProof.source === "server" ? "Synced server context" : "Visible app context"}
                              {actionProposal.contextProof.visibleModuleCount ? ` - ${actionProposal.contextProof.visibleModuleCount} visible areas` : ""}
                              {actionProposal.contextProof.attentionCount ? ` - ${actionProposal.contextProof.attentionCount} review signals` : ""}
                            </p>
                          </div>
                          {actionProposal.contextProof.requestId ? <Badge tone="blue">API</Badge> : <Badge tone="slate">Read-only</Badge>}
                        </div>
                        {actionProposal.contextProof.module ? (
                          <p className="mt-2 text-xs font-bold leading-5 text-slate-300">
                            {actionProposal.contextProof.module.label}: {actionProposal.contextProof.module.summary || "Visible for review-first context."}
                          </p>
                        ) : null}
                        <p className="mt-1 text-[11px] font-bold leading-5 text-slate-400">{actionProposal.contextProof.safetyBoundary}</p>
                      </div>
                    ) : null}
                    {permissions.audit?.canView ? (
                      <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.05] p-2">
                        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Manual audit record</p>
                            <p className="mt-1 text-xs font-bold leading-5 text-slate-300">
                              Records this review-first packet only. No approval, draft, send, conversion, or field update is created.
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant={proposalAlreadyRecorded ? "secondary" : "primary"}
                            disabled={!canRecordProposalAudit}
                            onClick={recordCurrentProposalAudit}
                          >
                            {auditRecordState.status === "saving" ? "Recording..." : proposalAlreadyRecorded ? "Recorded" : "Record audit"}
                          </Button>
                        </div>
                        {auditRecordState.message ? (
                          <p className={`mt-2 text-[11px] font-bold leading-4 ${auditRecordState.status === "error" ? "text-red-100" : "text-blue-100"}`}>
                            {auditRecordState.message}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <div className="rounded-xl border border-white/10 bg-white/[0.06] p-2">
                        <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Review checklist</span>
                        <ul className="mt-2 grid gap-1 text-xs font-bold leading-5 text-slate-200">
                          {actionProposal.reviewChecklist.slice(0, 4).map((item) => <li key={item}>- {item}</li>)}
                        </ul>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.06] p-2">
                        <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Blocked actions</span>
                        <ul className="mt-2 grid gap-1 text-xs font-bold leading-5 text-slate-200">
                          {actionProposal.blockedActions.slice(0, 4).map((item) => <li key={item}>- {item}</li>)}
                        </ul>
                      </div>
                    </div>
                    {actionProposal.draftPrep?.length ? (
                      <div className="mt-3 rounded-xl border border-blue-300/20 bg-blue-500/10 p-2">
                        <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-blue-100">Draft-only prep</span>
                        <div className="mt-2 grid gap-2">
                          {actionProposal.draftPrep.slice(0, 3).map((item) => (
                            <div key={item.id} className="rounded-xl border border-white/10 bg-white/[0.06] p-2">
                              <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-xs font-black uppercase tracking-[0.08em] text-blue-100">{item.prepType}</p>
                                  <p className="mt-1 break-words text-sm font-black text-white">{item.label}</p>
                                </div>
                                {item.warnings?.length ? <Badge tone="amber">{item.warnings.length} review</Badge> : <Badge tone="blue">Draft</Badge>}
                              </div>
                              <p className="mt-1 text-xs font-bold leading-5 text-slate-300">{item.helper}</p>
                              <p className="mt-1 text-xs font-bold leading-5 text-blue-100">{item.safeOutput}</p>
                              <p className="mt-1 text-[11px] font-bold leading-5 text-slate-400">{item.reviewLabel}</p>
                              {item.fields?.length ? (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {item.fields.map((field) => (
                                    <span key={field} className="rounded-lg bg-white/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-slate-200">{field}</span>
                                  ))}
                                </div>
                              ) : null}
                              {item.fieldPreview?.length ? (
                                <div className="mt-2 rounded-xl border border-white/10 bg-slate-950/50 p-2">
                                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Payload preview</p>
                                  <div className="mt-2 grid gap-2">
                                    {item.fieldPreview.slice(0, 6).map((row) => (
                                      <div key={row.id || row.field} className="rounded-lg border border-white/10 bg-white/[0.04] p-2">
                                        <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                                          <p className="break-words text-[11px] font-black uppercase tracking-[0.08em] text-blue-100">{row.field}</p>
                                          {row.source ? <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-slate-300">{row.source}</span> : null}
                                        </div>
                                        <div className="mt-1 grid gap-1 text-[11px] font-bold leading-4 text-slate-300">
                                          {row.currentValue ? <p><span className="text-slate-500">Current:</span> {row.currentValue}</p> : null}
                                          {row.proposedValue ? <p><span className="text-blue-100">Proposed:</span> {row.proposedValue}</p> : null}
                                          {row.note ? <p className="text-slate-400">{row.note}</p> : null}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : null}
                              {item.warnings?.length ? (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {item.warnings.map((warning) => (
                                    <span key={warning} className="rounded-lg bg-orange-500/20 px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-orange-100">{warning}</span>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {response.type === "contractor-advisor-loading" ? (
                  <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.08] p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-200">Contractor advisor</p>
                    <p className="mt-2 text-xs font-bold leading-5 text-slate-300">Reading leads, estimates, jobs, proof, time, and change order signals that this role can see.</p>
                  </div>
                ) : response.type === "contractor-advisor-answer" ? (
                  <div className="mt-3 grid gap-2">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-3">
                      <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-200">Contractor ChatGPT</p>
                          <p className="mt-1 text-sm font-black text-white">{response.category === "profit_leak" ? "Money leak readout" : response.category === "marketing" ? "Marketing readout" : "Operator answer"}</p>
                        </div>
                        <Badge tone={response.configured ? "blue" : "slate"}>{response.configured ? "AI" : "Local"}</Badge>
                      </div>
                      {response.sourceSummary?.length ? (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {response.sourceSummary.slice(0, 3).map((item) => (
                            <span key={item} className="rounded-lg border border-white/10 bg-white/[0.06] px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-slate-200">{item}</span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    {response.diagnosis?.length ? (
                      <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">What I see</p>
                        <div className="mt-2 grid gap-2">
                          {response.diagnosis.slice(0, 4).map((item) => (
                            <p key={item} className="rounded-xl border border-white/10 bg-white/[0.05] p-2 text-xs font-bold leading-5 text-slate-300">{item}</p>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {response.recommendedActions?.length ? (
                      <div className="grid gap-2">
                        {response.recommendedActions.slice(0, 5).map((action) => (
                          <button
                            key={action.id || action.label}
                            type="button"
                            onClick={() => openModule(action.moduleId || "commandCenter")}
                            className="co-focus-ring rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-left transition hover:border-orange-400/50 hover:bg-orange-500/10"
                          >
                            <span className="block text-sm font-black text-white">{action.label}</span>
                            <span className="mt-1 block text-xs font-bold leading-5 text-slate-300">{action.reason}</span>
                            <span className="mt-2 inline-flex rounded-lg bg-orange-500/20 px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-orange-100">{action.actionLabel || "Open workflow"}</span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {response.followUpQuestions?.length ? (
                      <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Smart follow-ups</p>
                        <div className="mt-2 grid gap-1">
                          {response.followUpQuestions.slice(0, 3).map((item) => (
                            <p key={item} className="text-xs font-bold leading-5 text-slate-300">{item}</p>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : response.type === "contractor-advisor-error" ? (
                  <Button type="button" size="sm" className="mt-3" onClick={() => openModule("commandCenter")}>Open Command Center</Button>
                ) : response.type === "daily-ops-brief" ? (
                  <div className="mt-3 grid gap-2">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Daily operations brief</p>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {(response.brief?.metrics || []).map((metric) => (
                          <span key={metric.label} className="rounded-xl border border-white/10 bg-white/[0.06] p-2">
                            <span className="block text-lg font-black text-white">{metric.value}</span>
                            <span className="mt-1 block text-[10px] font-black uppercase tracking-[0.08em] text-slate-400">{metric.label}</span>
                          </span>
                        ))}
                      </div>
                      <p className="mt-2 text-xs font-bold leading-5 text-slate-300">{response.brief?.safetyBoundary}</p>
                    </div>
                    {(response.brief?.sections || []).map((section) => (
                      <div key={section.id} className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-200">{section.label}</p>
                        <div className="mt-2 grid gap-2">
                          {(section.items || []).length ? section.items.map((item) => (
                            <button
                              key={`${section.id}-${item.id}`}
                              type="button"
                              onClick={() => openModule(item.moduleId)}
                              className="co-focus-ring rounded-xl border border-white/10 bg-white/[0.05] p-2 text-left transition hover:border-orange-400/50 hover:bg-orange-500/10"
                            >
                              <span className="flex min-w-0 items-start justify-between gap-2">
                                <span className="min-w-0">
                                  <span className="block break-words text-sm font-black text-white">{item.label}</span>
                                  <span className="mt-1 block break-words text-xs font-bold leading-5 text-slate-300">{item.detail}</span>
                                </span>
                                <span className="shrink-0 rounded-lg bg-white/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-slate-200">{item.count || 0}</span>
                              </span>
                            </button>
                          )) : (
                            <p className="rounded-xl border border-white/10 bg-white/[0.05] p-2 text-xs font-bold leading-5 text-slate-300">No visible items in this section.</p>
                          )}
                        </div>
                      </div>
                    ))}
                    <div className="flex flex-wrap gap-2">
                      {(response.actions || []).map((action) => (
                        <Button key={`${action.moduleId}-${action.actionLabel}`} type="button" size="sm" onClick={() => openModule(action.moduleId)}>
                          {action.actionLabel}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : response.type === "next-best-actions" ? (
                  <div className="mt-3 grid gap-2">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Agent next actions</p>
                      <p className="mt-1 text-sm font-black text-white">{response.nextActions?.actions?.length || 0} ranked review-first suggestion{response.nextActions?.actions?.length === 1 ? "" : "s"}.</p>
                      <p className="mt-1 text-xs font-bold leading-5 text-slate-300">{response.nextActions?.safetyBoundary}</p>
                    </div>
                    <div className="grid gap-2">
                      {(response.nextActions?.actions || []).map((item, index) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => openModule(item.moduleId)}
                          className="co-apex-assistant-context-card co-focus-ring w-full rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-left transition hover:border-orange-400/50 hover:bg-orange-500/10"
                        >
                          <span className="flex min-w-0 items-start justify-between gap-3">
                            <span className="min-w-0">
                              <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-orange-200">#{index + 1} - {item.actionLabel}</span>
                              <span className="mt-1 block break-words text-sm font-black text-white">{item.title}</span>
                              <span className="mt-1 block break-words text-xs font-bold leading-5 text-slate-300">{item.reason}</span>
                              <span className="mt-2 block break-words text-[11px] font-bold leading-5 text-blue-100">{item.reviewLabel}</span>
                              <span className="mt-1 block break-words text-[11px] font-bold leading-5 text-slate-400">{item.blockedAutomation}</span>
                            </span>
                            <span className="shrink-0 rounded-lg bg-white/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-slate-200">{item.needsAttention || 0} review</span>
                          </span>
                          {item.supportingRecords?.length ? (
                            <span className="mt-2 flex flex-wrap gap-1">
                              {item.supportingRecords.map((record) => (
                                <span key={`${item.id}-${record.id}`} className="rounded-lg bg-white/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-slate-200">{record.label}</span>
                              ))}
                            </span>
                          ) : null}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(response.actions || []).map((action) => (
                        <Button key={`${action.moduleId}-${action.actionLabel}`} type="button" size="sm" onClick={() => openModule(action.moduleId)}>
                          {action.actionLabel}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : response.type === "workflow-context-summary" ? (
                  <div className="mt-3 grid gap-2">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Agent workflow context</p>
                      <p className="mt-1 text-sm font-black text-white">{response.workflowContext?.attentionCount || 0} item{response.workflowContext?.attentionCount === 1 ? "" : "s"} need review across {response.workflowContext?.visibleModuleCount || 0} visible workflow area{response.workflowContext?.visibleModuleCount === 1 ? "" : "s"}.</p>
                      <p className="mt-1 text-xs font-bold leading-5 text-slate-300">{response.workflowContext?.safetyBoundary}</p>
                    </div>
                    <div className="grid gap-2">
                      {(response.workflowContext?.modules || []).map((module) => (
                        <button
                          key={module.id}
                          type="button"
                          onClick={() => openModule(module.moduleId)}
                          className="co-apex-assistant-context-card co-focus-ring w-full rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-left transition hover:border-orange-400/50 hover:bg-orange-500/10"
                        >
                          <span className="flex min-w-0 items-start justify-between gap-3">
                            <span className="min-w-0">
                              <span className="block break-words text-sm font-black text-white">{module.label}</span>
                              <span className="mt-1 block break-words text-xs font-bold leading-5 text-slate-300">{module.summary}</span>
                            </span>
                            <span className="shrink-0 rounded-lg bg-white/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-slate-200">{module.needsAttention || 0} review</span>
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(response.actions || []).map((action) => (
                        <Button key={`${action.moduleId}-${action.actionLabel}`} type="button" size="sm" onClick={() => openModule(action.moduleId)}>
                          {action.actionLabel}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : response.type === "missing-proof-summary" ? (
                  <div className="mt-3 grid gap-2">
                    {response.job?.title ? (
                      <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Job context</p>
                        <p className="mt-1 text-sm font-black text-white">{response.job.title}</p>
                      </div>
                    ) : null}
                    <div className="grid gap-2">
                      {(response.items || []).map((item) => (
                        <div key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
                          <div className="flex min-w-0 items-start justify-between gap-3">
                            <p className="text-sm font-black text-white">{item.label}</p>
                            <span className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] ${item.status === "complete" ? "bg-emerald-500/15 text-emerald-100" : item.status === "missing" ? "bg-orange-500/20 text-orange-100" : "bg-blue-500/20 text-blue-100"}`}>
                              {item.status === "complete" ? "Clear" : item.status === "missing" ? "Missing" : "Review"}
                            </span>
                          </div>
                          <p className="mt-1 text-xs font-bold leading-5 text-slate-300">{item.detail}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(response.actions || []).map((action) => (
                        <Button key={action.moduleId} type="button" size="sm" onClick={() => openModule(action.moduleId)}>
                          {action.actionLabel}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : response.type === "daily-closeout-readiness" ? (
                  <div className="mt-3 grid gap-2">
                    {response.closeoutSummary?.length ? (
                      <div className="grid gap-2">
                        {response.closeoutSummary.map((item) => (
                          <div key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.08] p-3">
                            <span className="block text-sm font-black text-white">{item.label}</span>
                            <span className="mt-1 block text-xs font-bold leading-5 text-slate-300">{item.detail}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      {(response.actions || []).map((action) => (
                        <Button key={action.moduleId} type="button" size="sm" onClick={() => openModule(action.moduleId)}>
                          {action.actionLabel}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : response.type === "job-handoff-review" ? (
                  <div className="mt-3 grid gap-2">
                    {response.matches?.length ? response.matches.map((match) => (
                      <button
                        key={match.id}
                        type="button"
                        onClick={() => openJobHandoff(match)}
                        className="co-focus-ring rounded-2xl border border-white/10 bg-white/[0.08] p-3 text-left transition hover:border-orange-300/60 hover:bg-orange-500/20"
                      >
                        <span className="block text-sm font-black text-white">{match.label}</span>
                        <span className="mt-1 block text-xs font-bold leading-5 text-slate-300">{match.helper || "Open startup checklist and job packet review. No job changes happen automatically."}</span>
                      </button>
                    )) : null}
                    <Button type="button" size="sm" onClick={() => openJobHandoff(response.fallback || {})}>
                      {response.matches?.length ? "Open Jobs instead" : response.actionLabel}
                    </Button>
                  </div>
                ) : response.type === "report-review" ? (
                  <div className="mt-3 grid gap-2">
                    {response.matches?.length ? response.matches.map((match) => (
                      <button
                        key={match.id}
                        type="button"
                        onClick={() => openReportReview(match)}
                        className="co-focus-ring rounded-2xl border border-white/10 bg-white/[0.08] p-3 text-left transition hover:border-orange-300/60 hover:bg-orange-500/20"
                      >
                        <span className="block text-sm font-black text-white">{match.label}</span>
                        <span className="mt-1 block text-xs font-bold leading-5 text-slate-300">{match.helper || "Open the report review drawer. No approval happens automatically."}</span>
                      </button>
                    )) : null}
                    <Button type="button" size="sm" onClick={() => openReportReview(response.fallback || {})}>
                      {response.matches?.length ? "Open Reports instead" : response.actionLabel}
                    </Button>
                  </div>
                ) : response.type === "upload-review" ? (
                  <div className="mt-3 grid gap-2">
                    {response.matches?.length ? response.matches.map((match) => (
                      <button
                        key={match.id}
                        type="button"
                        onClick={() => openUploadReview(match)}
                        className="co-focus-ring rounded-2xl border border-white/10 bg-white/[0.08] p-3 text-left transition hover:border-orange-300/60 hover:bg-orange-500/20"
                      >
                        <span className="block text-sm font-black text-white">{match.label}</span>
                        <span className="mt-1 block text-xs font-bold leading-5 text-slate-300">{match.helper || "Open the photo evidence review tools. No upload changes happen automatically."}</span>
                      </button>
                    )) : null}
                    <Button type="button" size="sm" onClick={() => openUploadReview(response.fallback || {})}>
                      {response.matches?.length ? "Open Photo Evidence instead" : response.actionLabel}
                    </Button>
                  </div>
                ) : response.type === "time-review" ? (
                  <div className="mt-3 grid gap-2">
                    {response.matches?.length ? response.matches.map((match) => (
                      <button
                        key={match.id}
                        type="button"
                        onClick={() => openTimeReview(match)}
                        className="co-focus-ring rounded-2xl border border-white/10 bg-white/[0.08] p-3 text-left transition hover:border-orange-300/60 hover:bg-orange-500/20"
                      >
                        <span className="block text-sm font-black text-white">{match.label}</span>
                        <span className="mt-1 block text-xs font-bold leading-5 text-slate-300">{match.helper || "Open the time board. No correction or clock action happens automatically."}</span>
                      </button>
                    )) : null}
                    <Button type="button" size="sm" onClick={() => openTimeReview(response.fallback || {})}>
                      {response.matches?.length ? "Open Time instead" : response.actionLabel}
                    </Button>
                  </div>
                ) : response.type === "change-order-review" ? (
                  <div className="mt-3 grid gap-2">
                    {response.matches?.length ? response.matches.map((match) => (
                      <button
                        key={match.id}
                        type="button"
                        onClick={() => openChangeOrderReview(match)}
                        className="co-focus-ring rounded-2xl border border-white/10 bg-white/[0.08] p-3 text-left transition hover:border-orange-300/60 hover:bg-orange-500/20"
                      >
                        <span className="block text-sm font-black text-white">{match.label}</span>
                        <span className="mt-1 block text-xs font-bold leading-5 text-slate-300">{match.helper || "Open the change order review drawer. No approval or pricing action happens automatically."}</span>
                      </button>
                    )) : null}
                    <Button type="button" size="sm" onClick={() => openChangeOrderReview(response.fallback || {})}>
                      {response.matches?.length ? "Open Change Orders instead" : response.actionLabel}
                    </Button>
                  </div>
                ) : response.type === "lead-follow-up" ? (
                  <div className="mt-3 grid gap-2">
                    {response.matches?.length ? response.matches.map((match) => (
                      <button
                        key={match.id}
                        type="button"
                        onClick={() => openLeadFollowUp(match)}
                        className="co-focus-ring rounded-2xl border border-white/10 bg-white/[0.08] p-3 text-left transition hover:border-orange-300/60 hover:bg-orange-500/20"
                      >
                        <span className="block text-sm font-black text-white">{match.label}</span>
                        <span className="mt-1 block text-xs font-bold leading-5 text-slate-300">{match.helper || "Open the lead follow-up queue. No customer contact happens automatically."}</span>
                      </button>
                    )) : null}
                    <Button type="button" size="sm" onClick={() => openLeadFollowUp(response.fallback || {})}>
                      {response.matches?.length ? "Open Leads instead" : response.actionLabel}
                    </Button>
                  </div>
                ) : response.type === "customer-account-review" ? (
                  <div className="mt-3 grid gap-2">
                    {response.matches?.length ? response.matches.map((match) => (
                      <button
                        key={match.id}
                        type="button"
                        onClick={() => openCustomerAccount(match)}
                        className="co-focus-ring rounded-2xl border border-white/10 bg-white/[0.08] p-3 text-left transition hover:border-orange-300/60 hover:bg-orange-500/20"
                      >
                        <span className="block text-sm font-black text-white">{match.label}</span>
                        <span className="mt-1 block text-xs font-bold leading-5 text-slate-300">{match.helper || "Open the customer command record. No customer contact or account change happens automatically."}</span>
                      </button>
                    )) : null}
                    <Button type="button" size="sm" onClick={() => openCustomerAccount(response.fallback || {})}>
                      {response.matches?.length ? "Open Customers instead" : response.actionLabel}
                    </Button>
                  </div>
                ) : response.type === "crew-readiness-review" ? (
                  <div className="mt-3 grid gap-2">
                    {response.matches?.length ? response.matches.map((match) => (
                      <button
                        key={match.id}
                        type="button"
                        onClick={() => openCrewReadiness(match)}
                        className="co-focus-ring rounded-2xl border border-white/10 bg-white/[0.08] p-3 text-left transition hover:border-orange-300/60 hover:bg-orange-500/20"
                      >
                        <span className="block text-sm font-black text-white">{match.label}</span>
                        <span className="mt-1 block text-xs font-bold leading-5 text-slate-300">{match.helper || "Open the crew readiness board. No assignment, invite, role, or time action happens automatically."}</span>
                      </button>
                    )) : null}
                    <Button type="button" size="sm" onClick={() => openCrewReadiness(response.fallback || {})}>
                      {response.matches?.length ? "Open Employees instead" : response.actionLabel}
                    </Button>
                  </div>
                ) : response.type === "schedule-dispatch-review" ? (
                  <div className="mt-3 grid gap-2">
                    {response.matches?.length ? response.matches.map((match) => (
                      <button
                        key={match.id}
                        type="button"
                        onClick={() => openScheduleDispatch(match)}
                        className="co-focus-ring rounded-2xl border border-white/10 bg-white/[0.08] p-3 text-left transition hover:border-orange-300/60 hover:bg-orange-500/20"
                      >
                        <span className="block text-sm font-black text-white">{match.label}</span>
                        <span className="mt-1 block text-xs font-bold leading-5 text-slate-300">{match.helper || "Open the schedule dispatch board. No schedule or crew action happens automatically."}</span>
                      </button>
                    )) : null}
                    <Button type="button" size="sm" onClick={() => openScheduleDispatch(response.fallback || {})}>
                      {response.matches?.length ? "Open Schedule instead" : response.actionLabel}
                    </Button>
                  </div>
                ) : response.type === "imported-draft-review" ? (
                  <div className="mt-3 grid gap-2">
                    {response.matches?.length ? response.matches.map((match) => (
                      <button
                        key={match.id}
                        type="button"
                        onClick={() => openImportedDraftReview(match)}
                        className="co-focus-ring rounded-2xl border border-white/10 bg-white/[0.08] p-3 text-left transition hover:border-orange-300/60 hover:bg-orange-500/20"
                      >
                        <span className="block text-sm font-black text-white">{match.label}</span>
                        <span className="mt-1 block text-xs font-bold leading-5 text-slate-300">{match.helper || "Open the imported draft review board. No import or job creation happens automatically."}</span>
                      </button>
                    )) : null}
                    <Button type="button" size="sm" onClick={() => openImportedDraftReview(response.fallback || {})}>
                      {response.matches?.length ? "Open Imported Drafts instead" : response.actionLabel}
                    </Button>
                  </div>
                ) : response.type === "support-workflow-review" ? (
                  <div className="mt-3 grid gap-2">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-3">
                      <span className="block text-sm font-black text-white">{response.workflow || "General workspace"}</span>
                      <span className="mt-1 block text-xs font-bold leading-5 text-slate-300">{response.blockerLevel || "Not a blocker"} - copy-only support packet. No ticket or message is sent automatically.</span>
                    </div>
                    <Button type="button" size="sm" onClick={() => openSupportWorkflow(response.seed || {})}>
                      {response.actionLabel}
                    </Button>
                  </div>
                ) : response.type === "delivery-ticket-review" ? (
                  <div className="mt-3 grid gap-2">
                    {response.matches?.length ? response.matches.map((match) => (
                      <button
                        key={match.id}
                        type="button"
                        onClick={() => openDeliveryTicketReview(match)}
                        className="co-focus-ring rounded-2xl border border-white/10 bg-white/[0.08] p-3 text-left transition hover:border-orange-300/60 hover:bg-orange-500/20"
                      >
                        <span className="block text-sm font-black text-white">{match.label}</span>
                        <span className="mt-1 block text-xs font-bold leading-5 text-slate-300">{match.helper || "Open the delivery ticket console. No save or archive happens automatically."}</span>
                      </button>
                    )) : null}
                    <Button type="button" size="sm" onClick={() => openDeliveryTicketReview(response.fallback || {})}>
                      {response.matches?.length ? "Open Tickets instead" : response.actionLabel}
                    </Button>
                  </div>
                ) : response.type === "pre-pour-review" ? (
                  <div className="mt-3 grid gap-2">
                    {response.matches?.length ? response.matches.map((match) => (
                      <button
                        key={match.id}
                        type="button"
                        onClick={() => openPrePourReview(match)}
                        className="co-focus-ring rounded-2xl border border-white/10 bg-white/[0.08] p-3 text-left transition hover:border-orange-300/60 hover:bg-orange-500/20"
                      >
                        <span className="block text-sm font-black text-white">{match.label}</span>
                        <span className="mt-1 block text-xs font-bold leading-5 text-slate-300">{match.helper || "Open the Job Prep review tools. No review action happens automatically."}</span>
                      </button>
                    )) : null}
                    <Button type="button" size="sm" onClick={() => openPrePourReview(response.fallback || {})}>
                      {response.matches?.length ? "Open Job Prep instead" : response.actionLabel}
                    </Button>
                  </div>
                ) : response.type === "post-pour-review" ? (
                  <div className="mt-3 grid gap-2">
                    {response.matches?.length ? response.matches.map((match) => (
                      <button
                        key={match.id}
                        type="button"
                        onClick={() => openPostPourReview(match)}
                        className="co-focus-ring rounded-2xl border border-white/10 bg-white/[0.08] p-3 text-left transition hover:border-orange-300/60 hover:bg-orange-500/20"
                      >
                        <span className="block text-sm font-black text-white">{match.label}</span>
                        <span className="mt-1 block text-xs font-bold leading-5 text-slate-300">{match.helper || "Open the Closeout review tools. No review action happens automatically."}</span>
                      </button>
                    )) : null}
                    <Button type="button" size="sm" onClick={() => openPostPourReview(response.fallback || {})}>
                      {response.matches?.length ? "Open Closeout instead" : response.actionLabel}
                    </Button>
                  </div>
                ) : response.type === "safety-incident-review" ? (
                  <div className="mt-3 grid gap-2">
                    {response.matches?.length ? response.matches.map((match) => (
                      <button
                        key={match.id}
                        type="button"
                        onClick={() => openSafetyIncidentReview(match)}
                        className="co-focus-ring rounded-2xl border border-white/10 bg-white/[0.08] p-3 text-left transition hover:border-orange-300/60 hover:bg-orange-500/20"
                      >
                        <span className="block text-sm font-black text-white">{match.label}</span>
                        <span className="mt-1 block text-xs font-bold leading-5 text-slate-300">{match.helper || "Open the safety incident tools. No review or resolve action happens automatically."}</span>
                      </button>
                    )) : null}
                    <Button type="button" size="sm" onClick={() => openSafetyIncidentReview(response.fallback || {})}>
                      {response.matches?.length ? "Open Safety instead" : response.actionLabel}
                    </Button>
                  </div>
                ) : response.type === "tool-checklist-review" ? (
                  <div className="mt-3 grid gap-2">
                    {response.matches?.length ? response.matches.map((match) => (
                      <button
                        key={match.id}
                        type="button"
                        onClick={() => openToolChecklistReview(match)}
                        className="co-focus-ring rounded-2xl border border-white/10 bg-white/[0.08] p-3 text-left transition hover:border-orange-300/60 hover:bg-orange-500/20"
                      >
                        <span className="block text-sm font-black text-white">{match.label}</span>
                        <span className="mt-1 block text-xs font-bold leading-5 text-slate-300">{match.helper || "Open the tool checklist review drawer. No review or checklist update happens automatically."}</span>
                      </button>
                    )) : null}
                    <Button type="button" size="sm" onClick={() => openToolChecklistReview(response.fallback || {})}>
                      {response.matches?.length ? "Open Tools instead" : response.actionLabel}
                    </Button>
                  </div>
                ) : response.type === "material-planning-review" ? (
                  <div className="mt-3 grid gap-2">
                    {response.sourceSummary?.length ? (
                      <div className="grid gap-2">
                        {response.sourceSummary.map((item) => (
                          <div key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.08] p-3">
                            <span className="block text-sm font-black text-white">{item.label}</span>
                            <span className="mt-1 block text-xs font-bold leading-5 text-slate-300">{item.detail}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {response.matches?.length ? response.matches.map((match) => (
                      <button
                        key={match.id}
                        type="button"
                        onClick={() => openModule(match.moduleId || response.moduleId)}
                        className="co-focus-ring rounded-2xl border border-white/10 bg-white/[0.08] p-3 text-left transition hover:border-orange-300/60 hover:bg-orange-500/20"
                      >
                        <span className="block text-sm font-black text-white">{match.label}</span>
                        <span className="mt-1 block text-xs font-bold leading-5 text-slate-300">{match.helper || "Review material planning context. No order, vendor message, or record change happens automatically."}</span>
                      </button>
                    )) : null}
                    <div className="flex flex-wrap gap-2">
                      {(response.actions?.length ? response.actions : [response.fallback]).filter(Boolean).map((action) => (
                        <Button key={action.moduleId || action.id || action.actionLabel} type="button" size="sm" onClick={() => openModule(action.moduleId || response.moduleId)}>
                          {action.actionLabel || action.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : response.type === "release-readiness-review" ? (
                  <div className="mt-3 grid gap-2">
                    {response.readinessSummary?.length ? (
                      <div className="grid gap-2">
                        {response.readinessSummary.map((item) => (
                          <div key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.08] p-3">
                            <span className="block text-sm font-black text-white">{item.label}</span>
                            <span className="mt-1 block text-xs font-bold leading-5 text-slate-300">{item.detail}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      {(response.actions || []).map((action) => (
                        <Button key={action.moduleId} type="button" size="sm" onClick={() => openModule(action.moduleId)}>
                          {action.actionLabel}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : response.type === "pilot-handoff-readiness" ? (
                  <div className="mt-3 grid gap-2">
                    {response.readinessSummary?.length ? (
                      <div className="grid gap-2">
                        {response.readinessSummary.map((item) => (
                          <div key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.08] p-3">
                            <span className="block text-sm font-black text-white">{item.label}</span>
                            <span className="mt-1 block text-xs font-bold leading-5 text-slate-300">{item.detail}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      {(response.actions || []).map((action) => (
                        <Button key={action.moduleId} type="button" size="sm" onClick={() => openModule(action.moduleId)}>
                          {action.actionLabel}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : response.type === "estimate-draft-review" ? (
                  <div className="mt-3 grid gap-2">
                    {response.matches?.length ? response.matches.map((match) => (
                      <div key={match.id} className="rounded-2xl border border-white/10 bg-white/[0.08] p-3">
                        <button
                          type="button"
                          onClick={() => startEstimateDraft(match)}
                          className="co-focus-ring w-full rounded-xl p-0 text-left transition hover:text-orange-100"
                        >
                          <span className="block text-sm font-black text-white">{match.label}</span>
                          <span className="mt-1 block text-xs font-bold leading-5 text-slate-300">{match.helper || "Review in Estimates before creating a draft."}</span>
                        </button>
                        {match.type === "lead" && match.leadId ? (
                          <div className="mt-3 rounded-xl border border-emerald-300/20 bg-emerald-500/10 p-2">
                            <p className="text-[11px] font-bold leading-4 text-emerald-100">
                              {response.operatorMode === "internal_draft_action"
                                ? "Apex Agent can do the internal draft step from this lead now. Customer sends, payments, schedule changes, and job creation stay in their own autonomy gates."
                                : "Human approval creates a Draft estimate from this lead. No proposal is sent, no customer is contacted, and no job is created."}
                            </p>
                            {response.blockedExternalActions?.length ? (
                              <div className="mt-2 grid gap-1">
                                {response.blockedExternalActions.map((action) => (
                                  <span key={action.id} className="rounded-lg border border-white/10 bg-black/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-emerald-50">
                                    Next gate: {action.label}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="primary"
                                disabled={draftActionState.status === "saving"}
                                onClick={() => approveAndCreateEstimateDraft(match)}
                              >
                                {draftActionState.status === "saving" && draftActionState.leadId === match.leadId
                                  ? "Creating draft..."
                                  : response.operatorMode === "internal_draft_action"
                                    ? "Do it: create draft"
                                    : "Approve & create draft"}
                              </Button>
                              <Button type="button" size="sm" variant="secondary" onClick={() => startEstimateDraft(match)}>
                                Open editor
                              </Button>
                            </div>
                            {draftActionState.leadId === match.leadId && draftActionState.message ? (
                              <p className={`mt-2 text-[11px] font-bold leading-4 ${draftActionState.status === "error" ? "text-red-100" : "text-emerald-100"}`}>
                                {draftActionState.message}
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    )) : null}
                    <Button type="button" size="sm" onClick={() => startEstimateDraft(response.fallback || {})}>
                      {response.matches?.length ? "Start clean new draft instead" : response.actionLabel}
                    </Button>
                  </div>
                ) : response.type === "estimate-packet-review" ? (
                  <div className="mt-3 grid gap-2">
                    {response.matches?.length ? response.matches.map((match) => (
                      <div key={match.id} className="rounded-2xl border border-white/10 bg-white/[0.08] p-3">
                        <button
                          type="button"
                          onClick={() => openEstimatePacket(match)}
                          className="co-focus-ring w-full rounded-xl p-0 text-left transition hover:text-orange-100"
                        >
                          <span className="block text-sm font-black text-white">{match.label}</span>
                          <span className="mt-1 block text-xs font-bold leading-5 text-slate-300">{match.helper || "Open packet tools for review. No send or print happens automatically."}</span>
                        </button>
                        {match.type === "estimate" && match.estimateId ? (
                          <div className="mt-3 rounded-xl border border-blue-300/20 bg-blue-500/10 p-2">
                            <p className="text-[11px] font-bold leading-4 text-blue-100">
                              Prepares human send review first. If the company email gate is enabled, the final button sends a real customer email through the normal estimate email workflow.
                            </p>
                            <p className="mt-1 text-[11px] font-bold leading-4 text-slate-300">
                              Email gate: {emailGateEnabled ? "enabled for human-confirmed estimate sends" : "not enabled for this company"}. SMS, bids, payments, portal writes, scheduling, and integrations stay locked.
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="primary"
                                disabled={sendReviewState.status === "saving" || sendReviewState.status === "sending"}
                                onClick={() => prepareEstimateSendReview(match)}
                              >
                                {sendReviewState.status === "saving" && sendReviewState.estimateId === match.estimateId ? "Preparing..." : "Prepare send review"}
                              </Button>
                              {sendReviewState.status === "ready" && sendReviewState.estimateId === match.estimateId && emailGateEnabled ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="danger"
                                  disabled={sendReviewState.status === "sending"}
                                  onClick={() => executeEstimateSendFromGate(match)}
                                >
                                  Send customer email
                                </Button>
                              ) : null}
                              <Button type="button" size="sm" variant="secondary" onClick={() => openEstimatePacket(match)}>
                                Open packet
                              </Button>
                            </div>
                            {sendReviewState.estimateId === match.estimateId && sendReviewState.message ? (
                              <p className={`mt-2 text-[11px] font-bold leading-4 ${sendReviewState.status === "error" ? "text-red-100" : "text-blue-100"}`}>
                                {sendReviewState.message}
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    )) : null}
                    <Button type="button" size="sm" onClick={() => openEstimatePacket(response.fallback || {})}>
                      {response.matches?.length ? "Open Estimates instead" : response.actionLabel}
                    </Button>
                  </div>
                ) : response.type === "estimate-job-handoff-review" ? (
                  <div className="mt-3 grid gap-2">
                    {response.handoffSummary?.length ? (
                      <div className="grid gap-2">
                        {response.handoffSummary.map((item) => (
                          <div key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.08] p-3">
                            <span className="block text-sm font-black text-white">{item.label}</span>
                            <span className="mt-1 block text-xs font-bold leading-5 text-slate-300">{item.detail}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {response.matches?.length ? response.matches.map((match) => (
                      <div key={match.id} className="rounded-2xl border border-white/10 bg-white/[0.08] p-3">
                        <button
                          type="button"
                          onClick={() => openEstimateJobHandoff(match)}
                          className="co-focus-ring w-full rounded-xl p-0 text-left transition hover:text-orange-100"
                        >
                          <span className="block text-sm font-black text-white">{match.label}</span>
                          <span className="mt-1 block text-xs font-bold leading-5 text-slate-300">{match.helper || "Review estimate-to-job handoff. No job is created automatically."}</span>
                          {match.reviewWarnings?.length ? (
                            <span className="mt-2 flex flex-wrap gap-1">
                              {match.reviewWarnings.slice(0, 3).map((warning) => (
                                <span key={warning} className="rounded-lg bg-orange-500/20 px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-orange-100">{warning}</span>
                              ))}
                            </span>
                          ) : null}
                        </button>
                        {match.readyForJobHandoff && !match.converted && match.estimateId ? (
                          <div className="mt-3 rounded-xl border border-emerald-300/20 bg-emerald-500/10 p-2">
                            <p className="text-[11px] font-bold leading-4 text-emerald-100">
                              Human approval creates a Draft job from this approved estimate. Apex will not schedule it, assign a crew, expose it to field users, contact the customer, invoice, or bill.
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="primary"
                                disabled={jobDraftState.status === "saving"}
                                onClick={() => approveAndCreateJobDraft(match)}
                              >
                                {jobDraftState.status === "saving" && jobDraftState.estimateId === match.estimateId ? "Creating draft job..." : "Approve & create draft job"}
                              </Button>
                              <Button type="button" size="sm" variant="secondary" onClick={() => openEstimateJobHandoff(match)}>
                                Open handoff
                              </Button>
                            </div>
                            {jobDraftState.estimateId === match.estimateId && jobDraftState.message ? (
                              <p className={`mt-2 text-[11px] font-bold leading-4 ${jobDraftState.status === "error" ? "text-red-100" : "text-emerald-100"}`}>
                                {jobDraftState.message}
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    )) : null}
                    <div className="flex flex-wrap gap-2">
                      {(response.actions?.length ? response.actions : [response.fallback]).filter(Boolean).map((action) => (
                        <Button key={action.moduleId || action.id || action.actionLabel} type="button" size="sm" onClick={() => action.moduleId ? openModule(action.moduleId) : openEstimateJobHandoff(response.fallback || {})}>
                          {action.actionLabel || action.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Button type="button" size="sm" className="mt-3" onClick={() => openModule(response.moduleId)}>{response.actionLabel}</Button>
                )}
              </div>
            ) : null}

            {permissions.audit?.canView ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.05] p-3">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Proposal audit history</p>
                    <p className="mt-1 text-sm font-black text-white">Review-first records</p>
                  </div>
                  <Badge tone={proposalAuditHistory.length ? "blue" : "slate"}>{proposalAuditHistory.length}</Badge>
                </div>
                {proposalAuditHistory.length ? (
                  <div className="mt-3 grid gap-2">
                    {proposalAuditHistory.map((event) => (
                      <div key={event.id} className="rounded-xl border border-white/10 bg-slate-950/60 p-2">
                        <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="break-words text-xs font-black text-white">{event.summary}</p>
                            <p className="mt-1 text-[11px] font-bold leading-4 text-slate-400">{event.sourceModule} / {event.actorName} / {formatDateTime(event.createdAt)}</p>
                          </div>
                          <Badge tone={event.tone}>{event.status === "blocked" ? "Blocked" : "Audit"}</Badge>
                        </div>
                        {event.blockedReasons.length ? (
                          <p className="mt-2 text-[11px] font-bold leading-4 text-orange-100">{event.blockedReasons[0]}</p>
                        ) : event.requiredApprovals.length ? (
                          <p className="mt-2 text-[11px] font-bold leading-4 text-blue-100">{event.requiredApprovals[0]}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs font-bold leading-5 text-slate-400">No agent proposal audit records are visible yet. Generated proposal records will appear here after server audit is enabled in the workflow.</p>
                )}
                <p className="mt-3 text-[11px] font-bold leading-5 text-slate-500">Read-only history. This panel cannot approve, create, send, convert, or change records.</p>
              </div>
            ) : null}

            <form className="co-apex-assistant-form mt-4 flex min-w-0 gap-2" onSubmit={handleSubmit}>
              <input
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                className="co-apex-assistant-input min-h-11 min-w-0 flex-1 rounded-2xl border border-white/10 bg-white px-3 py-2 text-sm font-bold text-slate-950 outline-none focus:border-orange-300"
                placeholder="Ask Apex Agent anything..."
              />
              <button type="submit" className="co-focus-ring inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-600 text-white shadow-sm shadow-orange-950/20 hover:bg-orange-700" aria-label="Ask Apex Assistant">
                <Icon name="arrowUpRight" className="h-4 w-4" />
              </button>
            </form>
            <p className="mt-3 text-[11px] font-bold leading-5 text-slate-400">Ask about marketing, money leaks, estimates, jobs, crews, proof, or follow-up. External sends, payments, schedule changes, and approvals still use their normal gates.</p>
          </div>
        </div>
      ) : showLauncher ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="co-apex-assistant-trigger co-focus-ring ml-auto flex max-w-full items-center gap-2 rounded-full border border-slate-800 bg-slate-950 px-4 py-3 text-left text-white shadow-[0_18px_60px_-28px_rgba(2,6,23,0.88)] transition hover:bg-slate-900"
          aria-label="Open Apex Assistant"
        >
          <span className="co-apex-assistant-logo-tile co-apex-assistant-logo-tile--launcher inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl">
            <img src={APEX_BRAND_ASSETS.appMark} alt="" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-black">Apex Assistant</span>
            <span className="block truncate text-xs font-bold text-slate-300">Tap for {assistantState.statusLabel}</span>
          </span>
          <span className="co-apex-assistant-launcher-count" aria-label={`${assistantState.watchtowerQueue.length || assistantState.watchtowerActions.length} assistant items`}>
            {assistantState.watchtowerQueue.length || assistantState.watchtowerActions.length}
          </span>
        </button>
      ) : null}
    </div>
  );
}

