import { useEffect, useState } from "react";

import {
  Badge,
  Button,
  Card,
  CommandPageFrame,
  DesktopCommandDrawer,
  DesktopCommandWorkspaceFrame,
  Icon,
  InputField,
  PageHeader,
  SectionHeader,
  SelectField,
  TextAreaField,
  WorkQueueCard,
} from "./app-shell-components";
import {
  buildPilotFeedbackPacket,
  buildSupportPacket,
  createSupportDraft,
  getSupportWorkflowOptionsForUser,
  PILOT_FEEDBACK_STAGE_OPTIONS,
  PILOT_NEXT_ACTION_OPTIONS,
  PILOT_WORKFLOW_FIT_OPTIONS,
  SUPPORT_BLOCKER_OPTIONS,
  SUPPORT_PILOT_FEEDBACK_WORKFLOW,
} from "./support-utils";
import { SUPPORT_DRAFT_SESSION_KEY } from "./app-runtime-constants";
import { canCapturePilotFeedback, canRequestPackageReview } from "../shared/permissions.js";

function supportCommandSeverityTone(blockerLevel = "") {
  if (/blocking/i.test(blockerLevel) && /field/i.test(blockerLevel)) return "red";
  if (/blocking/i.test(blockerLevel)) return "red";
  if (/slowing/i.test(blockerLevel)) return "amber";
  return "green";
}

function supportCommandWorkflowRows({ isOfficeUser = false, canRequestUpgradeReview = false, supportWorkflowOptions = [] } = {}) {
  const canUseWorkflow = (workflow) => supportWorkflowOptions.includes(workflow);
  const row = ({ id, label, workflow, role, helper, nextAction, tone = "orange", status = "Ready", blocker = false }) => ({
    id,
    label,
    workflow: canUseWorkflow(workflow) ? workflow : "General workspace",
    role,
    helper,
    nextAction,
    tone,
    status,
    blocker,
  });

  return [
    row({
      id: "account-login",
      label: "Account / login",
      workflow: "Login / access",
      role: "Owner, admin, field",
      helper: "Sign-in, invite, password, or workspace access issue.",
      nextAction: "Capture role, email, and what screen failed",
      tone: "blue",
    }),
    row({
      id: "estimates-proposals",
      label: "Estimates / proposals",
      workflow: "Estimates / proposals",
      role: "Office",
      helper: "Proposal, packet, send state, or estimate workflow issue.",
      nextAction: "Attach estimate name and expected result",
      tone: "orange",
    }),
    row({
      id: "jobs-field",
      label: "Jobs / field mode",
      workflow: "Jobs / schedule",
      role: "Office + field",
      helper: "Job handoff, field mode, schedule, or assignment problem.",
      nextAction: "Capture job, crew, device, and blocker",
      tone: "green",
    }),
    row({
      id: "reports-uploads-proof",
      label: "Reports / uploads / proof",
      workflow: canUseWorkflow("Photos / uploads") ? "Photos / uploads" : "Daily reports",
      role: "Field + office",
      helper: "Photo evidence, daily report, checklist, or proof intake issue.",
      nextAction: "Include job/date and what proof is missing",
      tone: "amber",
    }),
    row({
      id: "billing-ready",
      label: "Billing / ready-to-bill",
      workflow: canRequestUpgradeReview ? "Upgrade / package review" : "General workspace",
      role: isOfficeUser ? "Office only" : "Support context only",
      helper: "Ready-to-bill handoff context only. No money movement or plan changes here.",
      nextAction: "Describe the blocked closeout step",
      tone: isOfficeUser ? "green" : "slate",
    }),
    row({
      id: "permissions-roles",
      label: "Permissions / roles",
      workflow: "Login / access",
      role: "Owner/admin review",
      helper: "Role boundary, module access, invite, or protected-route question.",
      nextAction: "Copy role and target module",
      tone: isOfficeUser ? "blue" : "amber",
    }),
    row({
      id: "safety-incidents",
      label: "Safety / incidents",
      workflow: "Safety / tools",
      role: "Field + safety",
      helper: "Incident, PPE, tool checklist, or safety follow-up support.",
      nextAction: "Capture incident/job and urgency",
      tone: "red",
      blocker: true,
    }),
    row({
      id: "data-imports",
      label: "Data / imports",
      workflow: isOfficeUser ? "Setup / onboarding" : "General workspace",
      role: "Office setup",
      helper: "Startup import, setup, customer data, or onboarding question.",
      nextAction: "Copy workspace and setup progress",
      tone: "slate",
    }),
  ];
}

export function SupportCommandWorkbench({
  user,
  companyName,
  currentCompanyId,
  selectedWorkflow,
  blockerLevel,
  draft,
  isOfficeUser,
  isPilotFeedback,
  isUpgradeReview,
  canRequestUpgradeReview,
  supportWorkflowOptions,
  onSelectWorkflow,
  onSetBlocker,
  onCopySupportRequest,
}) {
  const workflowRows = supportCommandWorkflowRows({ isOfficeUser, canRequestUpgradeReview, supportWorkflowOptions });
  const selectedRow = workflowRows.find((row) => row.workflow === selectedWorkflow) || workflowRows[0];
  const blockerTone = supportCommandSeverityTone(blockerLevel);
  const blockedCount = /blocking/i.test(blockerLevel) ? 1 : 0;
  const waitingOnUser = Boolean(draft?.summary || draft?.expected || draft?.workaround) ? 0 : 1;
  const supportKpis = [
    { label: "Current draft", value: isPilotFeedback ? "Pilot" : isUpgradeReview ? "Upgrade" : "Support", helper: "Copy-only handoff", tone: isPilotFeedback ? "blue" : isUpgradeReview ? "orange" : "green", action: "Copy", onClick: onCopySupportRequest },
    { label: "Workflows", value: workflowRows.length, helper: "Support categories", tone: "blue", action: "Review", onClick: () => onSelectWorkflow(selectedRow.workflow) },
    { label: "Blockers", value: blockedCount, helper: blockerLevel || "Not a blocker", tone: blockerTone, action: blockedCount ? "Escalate" : "Safe", onClick: () => onSetBlocker(blockedCount ? blockerLevel : "Slowing work down") },
    { label: "Waiting on", value: waitingOnUser ? "User" : "Packet", helper: waitingOnUser ? "Need issue details" : "Ready to copy", tone: waitingOnUser ? "amber" : "green", action: waitingOnUser ? "Fill details" : "Send manual", onClick: onCopySupportRequest },
  ];
  const workflowFacts = [
    { label: "Role", value: user?.role || "Unknown", state: isOfficeUser ? "ready" : "needs" },
    { label: "Workspace", value: companyName || "Apex HQ", state: "ready" },
    { label: "Page", value: typeof window !== "undefined" ? window.location.pathname : "/support", state: "ready" },
    { label: "Boundary", value: "Manual only", state: "needs" },
    { label: "Secrets", value: "Not included", state: "ready" },
    { label: "Access", value: isOfficeUser ? "Office" : "Field safe", state: "ready" },
  ];

  return (
    <CommandPageFrame
      className="co-support-northstar-frame"
      kpis={
        <div className="co-support-command-kpis">
          {supportKpis.map((item) => (
            <button key={item.label} type="button" className="co-support-command-kpi" data-tone={item.tone} onClick={item.onClick}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <em>{item.helper}</em>
              <b>{item.action}</b>
            </button>
          ))}
        </div>
      }
    >
      <section className="co-support-command-workbench" aria-label="Support operations command board">
        <div className="co-support-command-head">
          <div className="min-w-0">
            <p>Support operations command</p>
            <h2>Issue queue, workflow context, role boundary, and safe handoff</h2>
            <span>Support stays operational: identify the workflow, capture blocker level, copy the right packet, and avoid changing permissions or creating tickets automatically.</span>
          </div>
          <div className="co-support-command-actions">
            <Button type="button" onClick={onCopySupportRequest}><Icon name="clipboard" />Copy Packet</Button>
            <Button type="button" variant="secondary" onClick={() => onSetBlocker("Blocking office work")}>Mark Blocking</Button>
          </div>
        </div>
        <div className="co-support-command-grid">
          <div className="co-support-workflow-queue">
            <div className="co-support-section-head">
              <span>Support queue</span>
              <strong>{workflowRows.length} workflows</strong>
            </div>
            {workflowRows.map((row) => (
              <WorkQueueCard
                key={row.id}
                eyebrow={row.role}
                title={row.label}
                meta={row.helper}
                status={row.status}
                tone={selectedWorkflow === row.workflow ? supportCommandSeverityTone(blockerLevel) : row.tone}
                actionLabel={row.nextAction}
                selected={selectedWorkflow === row.workflow}
                onClick={() => onSelectWorkflow(row.workflow)}
              >
                <div className="co-support-row-facts">
                  <span>Workflow <strong>{row.workflow}</strong></span>
                  <span data-state={row.blocker ? "needs" : "ready"}>Risk <strong>{row.blocker ? "Safety" : "Standard"}</strong></span>
                </div>
              </WorkQueueCard>
            ))}
          </div>
          <div className="co-support-selected-panel">
            <div className="co-support-section-head">
              <span>Selected support context</span>
              <strong>{selectedRow.nextAction}</strong>
            </div>
            <div className="co-support-selected-title">
              <div className="min-w-0">
                <h3>{selectedRow.label}</h3>
                <p>{selectedRow.helper}</p>
              </div>
              <Badge tone={blockerTone}>{blockerLevel}</Badge>
            </div>
            <div className="co-support-proof-grid">
              {workflowFacts.map((fact) => (
                <span key={fact.label} data-state={fact.state}><em>{fact.label}</em><strong>{fact.value}</strong></span>
              ))}
            </div>
            <div className="co-support-next-panel">
              <span>Safe handoff</span>
              <strong>{selectedRow.nextAction}</strong>
              <p>Workspace {companyName || "Apex HQ"} / company ID {currentCompanyId || "unavailable"} / no secrets, no impersonation, no automatic send.</p>
            </div>
          </div>
        </div>
      </section>
    </CommandPageFrame>
  );
}

export function SupportPage({ user, companyName, currentCompanyId, active, permissions, setActive, supportDraftSeed }) {
  const [draft, setDraft] = useState(() => createSupportDraft());
  const [copyMessage, setCopyMessage] = useState("");
  const isOfficeUser = Boolean(permissions?.settings?.canView || permissions?.users?.canView || permissions?.audit?.canView);
  const canRequestUpgradeReview = canRequestPackageReview(user);
  const canCaptureFeedback = canCapturePilotFeedback(user);
  const supportWorkflowOptions = getSupportWorkflowOptionsForUser(user);
  const selectedWorkflow = supportWorkflowOptions.includes(draft.workflow) ? draft.workflow : "General workspace";
  const isUpgradeReview = canRequestUpgradeReview && selectedWorkflow === "Upgrade / package review";
  const isSetupReview = isOfficeUser && selectedWorkflow === "Setup / onboarding";
  const isPilotFeedback = canCaptureFeedback && selectedWorkflow === SUPPORT_PILOT_FEEDBACK_WORKFLOW;
  useEffect(() => {
    if (!supportDraftSeed?.nonce) return;
    const { nonce, ...seed } = supportDraftSeed;
    const allowedWorkflows = getSupportWorkflowOptionsForUser(user);
    setDraft((current) => createSupportDraft({
      ...current,
      ...seed,
      workflow: seed.workflow && allowedWorkflows.includes(seed.workflow) ? seed.workflow : current.workflow,
    }));
    setCopyMessage("");
  }, [supportDraftSeed?.nonce, supportDraftSeed?.workflow, user]);
  useEffect(() => {
    if (supportDraftSeed?.nonce || typeof window === "undefined") return;
    const rawSeed = window.sessionStorage.getItem(SUPPORT_DRAFT_SESSION_KEY);
    if (!rawSeed) return;
    window.sessionStorage.removeItem(SUPPORT_DRAFT_SESSION_KEY);
    let seed = null;
    try {
      seed = JSON.parse(rawSeed);
    } catch {
      seed = null;
    }
    if (!seed) return;
    const allowedWorkflows = getSupportWorkflowOptionsForUser(user);
    setDraft((current) => createSupportDraft({
      ...current,
      ...seed,
      workflow: seed.workflow && allowedWorkflows.includes(seed.workflow) ? seed.workflow : current.workflow,
    }));
    setCopyMessage("");
  }, [supportDraftSeed?.nonce, user]);
  const packetContext = {
    user,
    companyName,
    currentCompanyId,
    activeModule: active,
    path: typeof window !== "undefined" ? window.location.pathname : "/support",
  };
  const supportPacket = isPilotFeedback
    ? buildPilotFeedbackPacket({ ...packetContext, draft: draft.pilotFeedback })
    : buildSupportPacket({ ...packetContext, draft: { ...draft, workflow: selectedWorkflow }, includeSetupContext: isOfficeUser });
  const quickActions = [
    { label: "My work", helper: "Open assigned jobs and field tasks.", moduleId: "jobs", icon: "briefcase", show: true },
    { label: "Clock", helper: "Open time tracking.", moduleId: "time", icon: "clock", show: true },
    { label: "Photos", helper: "Open uploads/photo evidence.", moduleId: "uploads", icon: "upload", show: Boolean(permissions?.uploads?.canView) },
    { label: "Reports", helper: "Open daily reports if your role can use them.", moduleId: "reports", icon: "document", show: Boolean(permissions?.reports?.canView) },
    { label: "Settings", helper: "Open owner/admin setup tools.", moduleId: "settings", icon: "settings", show: Boolean(permissions?.settings?.canView) },
  ].filter((item) => item.show);
  function updateDraft(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
    setCopyMessage("");
  }

  function updatePilotFeedback(field, value) {
    setDraft((current) => createSupportDraft({
      ...current,
      pilotFeedback: {
        ...(current.pilotFeedback || {}),
        [field]: value,
      },
    }));
    setCopyMessage("");
  }

  async function copySupportRequest() {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(supportPacket);
      } else if (typeof document !== "undefined") {
        const textArea = document.createElement("textarea");
        textArea.value = supportPacket;
        textArea.setAttribute("readonly", "");
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      } else {
        throw new Error("Clipboard unavailable");
      }
      setCopyMessage(isPilotFeedback ? "Feedback packet copied. Paste it into your founder review notes." : "Support request copied. Paste it into your support message with any screenshot.");
    } catch {
      setCopyMessage("Could not copy automatically. Select the preview text and copy it manually.");
    }
  }

  return (
    <div className="co-office-page co-support-page">
      <PageHeader
        eyebrow="Support"
        title="Support Command Center"
        description="Triage workflow issues, copy safe handoff packets, and keep support manual until messaging automation is ready."
        actions={<Badge tone="green">Manual handoff</Badge>}
      />
      <DesktopCommandWorkspaceFrame className="co-support-desktop-workspace-frame">
        <SupportCommandWorkbench
          user={user}
          companyName={companyName}
          currentCompanyId={currentCompanyId}
          selectedWorkflow={selectedWorkflow}
          blockerLevel={draft.blockerLevel}
          draft={draft}
          isOfficeUser={isOfficeUser}
          isPilotFeedback={isPilotFeedback}
          isUpgradeReview={isUpgradeReview}
          canRequestUpgradeReview={canRequestUpgradeReview}
          supportWorkflowOptions={supportWorkflowOptions}
          onSelectWorkflow={(workflow) => updateDraft("workflow", workflow)}
          onSetBlocker={(blocker) => updateDraft("blockerLevel", blocker)}
          onCopySupportRequest={copySupportRequest}
        />
        <DesktopCommandDrawer
          className="co-support-tools-drawer"
          variant="bottom"
          title={isPilotFeedback ? "Feedback Packet Tools" : "Support Request Tools"}
          description={isPilotFeedback ? "Edit pilot feedback context, preview the packet, and keep it manual." : "Edit request details, preview the handoff packet, and open the right workspace."}
          summaryLabel={isPilotFeedback ? "Open feedback tools" : "Open request tools"}
        >
          <div className="co-support-command-layout grid min-w-0 gap-4 px-5 sm:px-6 xl:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
            <div className="grid gap-4">
              <Card className="co-support-request-card p-5">
            <SectionHeader
              title={isPilotFeedback ? "Capture pilot feedback" : "Create a support request"}
              description={isPilotFeedback ? "Owner/admin internal notes for founder-led demos and controlled pilots. Copy the packet for manual review." : "Apex HQ does not send this automatically. Copy the packet, add a screenshot if useful, and send it through your normal support channel."}
            />
            <div className="grid gap-3 md:grid-cols-2">
              <SelectField label="Workflow / page" value={selectedWorkflow} onChange={(event) => updateDraft("workflow", event.target.value)}>
                {supportWorkflowOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </SelectField>
              {isPilotFeedback ? (
                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 px-3 py-2 text-sm font-bold leading-6 text-blue-900">
                  Internal only. This does not send surveys, publish testimonials, update outreach, or change customer data.
                </div>
              ) : (
                <SelectField label="Blocker level" value={draft.blockerLevel} onChange={(event) => updateDraft("blockerLevel", event.target.value)}>
                  {SUPPORT_BLOCKER_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                </SelectField>
              )}
            </div>
            {isPilotFeedback ? (
              <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <InputField label="Contractor / company" value={draft.pilotFeedback.contractorCompany} onChange={(event) => updatePilotFeedback("contractorCompany", event.target.value)} placeholder="ABC Concrete" />
                  <InputField label="Contact name" value={draft.pilotFeedback.contactName} onChange={(event) => updatePilotFeedback("contactName", event.target.value)} placeholder="Jordan Owner" />
                  <InputField label="Contact role" value={draft.pilotFeedback.contactRole} onChange={(event) => updatePilotFeedback("contactRole", event.target.value)} placeholder="Owner, admin, foreman..." />
                  <InputField label="Primary workflow" value={draft.pilotFeedback.primaryWorkflow} onChange={(event) => updatePilotFeedback("primaryWorkflow", event.target.value)} placeholder="Lead to estimate to field handoff" />
                  <SelectField label="Stage" value={draft.pilotFeedback.stage} onChange={(event) => updatePilotFeedback("stage", event.target.value)}>
                    {PILOT_FEEDBACK_STAGE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                  </SelectField>
                  <SelectField label="Workflow fit" value={draft.pilotFeedback.workflowFit} onChange={(event) => updatePilotFeedback("workflowFit", event.target.value)}>
                    {PILOT_WORKFLOW_FIT_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                  </SelectField>
                  <SelectField label="Next action" value={draft.pilotFeedback.nextAction} onChange={(event) => updatePilotFeedback("nextAction", event.target.value)}>
                    {PILOT_NEXT_ACTION_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                  </SelectField>
                  <InputField label="Follow-up owner" value={draft.pilotFeedback.followUpOwner} onChange={(event) => updatePilotFeedback("followUpOwner", event.target.value)} placeholder="Founder, admin, sales owner..." />
                  <InputField label="Follow-up date" type="date" value={draft.pilotFeedback.followUpDate} onChange={(event) => updatePilotFeedback("followUpDate", event.target.value)} />
                  <SelectField label="Permission to use quote" value={draft.pilotFeedback.permissionToUseQuote} onChange={(event) => updatePilotFeedback("permissionToUseQuote", event.target.value)}>
                    {["No", "Yes later", "Yes approved"].map((option) => <option key={option} value={option}>{option}</option>)}
                  </SelectField>
                  <SelectField label="Testimonial candidate" value={draft.pilotFeedback.testimonialCandidate} onChange={(event) => updatePilotFeedback("testimonialCandidate", event.target.value)}>
                    {["No", "Maybe", "Yes, needs permission"].map((option) => <option key={option} value={option}>{option}</option>)}
                  </SelectField>
                </div>
                <div className="mt-3 grid gap-3">
                  <TextAreaField label="Top pain / workflow gap" value={draft.pilotFeedback.topPain} onChange={(event) => updatePilotFeedback("topPain", event.target.value)} placeholder="What did they say is costing time, money, or trust?" />
                  <TextAreaField label="Objections / buying friction" value={draft.pilotFeedback.objections} onChange={(event) => updatePilotFeedback("objections", event.target.value)} placeholder="Price, setup time, team adoption, missing feature, trust concern..." />
                  <TextAreaField label="Field / admin friction" value={draft.pilotFeedback.fieldAdminFriction} onChange={(event) => updatePilotFeedback("fieldAdminFriction", event.target.value)} placeholder="Where did office, foreman, or employee workflow feel hard?" />
                  <TextAreaField label="Private founder notes" value={draft.pilotFeedback.privateNotes} onChange={(event) => updatePilotFeedback("privateNotes", event.target.value)} placeholder="Internal notes only. Do not publish without explicit permission." />
                </div>
              </div>
            ) : (
              <>
                {isUpgradeReview ? (
                  <div className="mt-3 rounded-2xl border border-orange-100 bg-orange-50/70 p-4">
                    <SectionHeader title="Manual upgrade context" description="Owner/admin context only. This does not change packages, collect payment, create invoices, or start checkout." />
                    <div className="grid gap-3 md:grid-cols-2">
                      <InputField label="Current package" value={draft.currentPackage} onChange={(event) => updateDraft("currentPackage", event.target.value)} placeholder="Basic" />
                      <InputField label="Requested package" value={draft.requestedPackage} onChange={(event) => updateDraft("requestedPackage", event.target.value)} placeholder="Premium or Elite" />
                      <InputField label="Requested feature" value={draft.requestedFeature} onChange={(event) => updateDraft("requestedFeature", event.target.value)} placeholder="App Health, Watchtower, Lead Finder..." />
                      <InputField label="Reason / use case" value={draft.upgradeReason} onChange={(event) => updateDraft("upgradeReason", event.target.value)} placeholder="What workflow needs review?" />
                    </div>
                  </div>
                ) : null}
                {isSetupReview ? (
                  <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                    <SectionHeader title="Managed setup context" description="Owner/admin setup context only. This does not send a message, widen field access, or start field rollout." />
                    <div className="grid gap-3 md:grid-cols-2">
                      <InputField label="Setup status" value={draft.setupStatus} onChange={(event) => updateDraft("setupStatus", event.target.value)} placeholder="In Progress" />
                      <InputField label="Setup progress" value={draft.setupProgress} onChange={(event) => updateDraft("setupProgress", event.target.value)} placeholder="12/34 (35%)" />
                      <InputField label="Critical blockers" value={draft.setupBlockers} onChange={(event) => updateDraft("setupBlockers", event.target.value)} placeholder="Service area; roles reviewed" />
                      <InputField label="Next setup action" value={draft.setupNextAction} onChange={(event) => updateDraft("setupNextAction", event.target.value)} placeholder="Finish setup blockers before rollout." />
                    </div>
                    <div className="mt-3">
                      <TextAreaField label="Setup notes" value={draft.setupNotes} onChange={(event) => updateDraft("setupNotes", event.target.value)} placeholder="Owner/admin setup notes for manual review." />
                    </div>
                  </div>
                ) : null}
                <div className="mt-3 grid gap-3">
                  <InputField label="Follow-up needed" value={draft.followUpNeeded} onChange={(event) => updateDraft("followUpNeeded", event.target.value)} placeholder="Example: Today before 3 PM, tomorrow morning, or not urgent." />
                  <TextAreaField label="What happened?" value={draft.summary} onChange={(event) => updateDraft("summary", event.target.value)} placeholder="Example: I tapped Upload Photo and nothing happened." />
                  <TextAreaField label="What should have happened?" value={draft.expected} onChange={(event) => updateDraft("expected", event.target.value)} placeholder="Example: The camera/photo picker should open." />
                  <TextAreaField label="Workaround / urgency" value={draft.workaround} onChange={(event) => updateDraft("workaround", event.target.value)} placeholder="Example: Texted the photo to the office. Blocking today's report." />
                </div>
              </>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button type="button" onClick={copySupportRequest}><Icon name="clipboard" />{isPilotFeedback ? "Copy feedback packet" : "Copy support request"}</Button>
              <p className="text-sm font-bold text-slate-500">{copyMessage || (isPilotFeedback ? "Copy-only keeps feedback safe: no survey, outreach, testimonial, or automation is created." : "Copy-only keeps support safe: no email, text, upload, or ticket is created automatically.")}</p>
            </div>
              </Card>

              <Card className="co-support-preview-card p-5">
            <SectionHeader
              title={isPilotFeedback ? "Feedback packet preview" : "Support packet preview"}
              description={isPilotFeedback ? "Review before saving in founder notes. Nothing is sent, published, or written to customer records." : "Review before sending. Add a screenshot or screen recording outside Apex HQ when useful."}
            />
            <pre className="max-h-[420px] overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-700">{supportPacket}</pre>
              </Card>
            </div>

            <aside className="co-support-rail grid h-fit gap-4">
              <div className="co-support-rail-card p-4">
            <SectionHeader title="Quick help" description="Common support info to capture before a call or message." />
            <div className="grid gap-2 text-sm leading-6 text-slate-700">
              <div className="co-support-context-tile"><strong>Company</strong><br />{companyName || "Apex HQ Workspace"}</div>
              <div className="co-support-context-tile"><strong>Role</strong><br />{user?.role || "Unknown"}</div>
              <div className="co-support-context-tile"><strong>Current page</strong><br />{typeof window !== "undefined" ? window.location.pathname : "/support"}</div>
              <div className="co-support-context-tile"><strong>Priority</strong><br />Blocker, workaround, and expected result matter most.</div>
            </div>
              </div>

              <div className="co-support-rail-card p-4">
            <SectionHeader title="Open workspace" description="Jump back to the screen involved in the issue." />
            <div className="grid gap-2">
              {quickActions.map((action) => (
                <button key={action.moduleId} type="button" className="co-settings-action-row" onClick={() => setActive?.(action.moduleId)}>
                  <span>
                    <strong>{action.label}</strong>
                    <em>{action.helper}</em>
                  </span>
                  <Icon name={action.icon} />
                </button>
              ))}
            </div>
              </div>

              <div className="co-support-rail-card p-4">
            <SectionHeader title="Support rules" description="What Apex HQ will not do from this page." />
            <div className="grid gap-2">
              <div className="co-ai-boundary-row" data-state="manual"><span>Sending</span><strong>Manual only</strong></div>
              <div className="co-ai-boundary-row" data-state="safe"><span>Field data</span><strong>Role safe</strong></div>
              <div className="co-ai-boundary-row" data-state="safe"><span>Secrets</span><strong>Not included</strong></div>
              <div className="co-ai-boundary-row" data-state="manual"><span>Feedback</span><strong>Internal only</strong></div>
              <div className="co-ai-boundary-row" data-state="manual"><span>Custom builds</span><strong>Not promised</strong></div>
            </div>
              </div>

              {isOfficeUser ? (
                <div className="co-support-rail-card p-4">
                  <SectionHeader title="Owner tools" description="Office roles can open setup and health tools when included." />
                  <Button type="button" size="sm" variant="secondary" onClick={() => setActive?.("settings")}>Open Settings</Button>
                </div>
              ) : null}
            </aside>
          </div>
        </DesktopCommandDrawer>
      </DesktopCommandWorkspaceFrame>
    </div>
  );
}
