import {
  AssistantRail,
  Badge,
  Button,
  CommandPageFrame,
  Icon,
  WorkQueueCard,
} from "./app-shell-components";

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
  onOpenModule,
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
      rail={
        <AssistantRail
          eyebrow="Apex Assistant"
          title="Support"
          description={`${selectedRow.label}: ${selectedRow.nextAction}. Safe manual handoff only.`}
          priorities={[
            { value: blockedCount, label: "Blocking workflows", tone: blockedCount ? "red" : "green" },
            { value: waitingOnUser, label: "Need user detail", tone: waitingOnUser ? "amber" : "green" },
            { value: supportWorkflowOptions.length, label: "Allowed workflows", tone: "blue" },
            { value: isOfficeUser ? "Office" : "Field", label: "Role boundary", tone: isOfficeUser ? "blue" : "amber" },
          ]}
          actions={[
            { label: "Copy packet", icon: "clipboard", onClick: onCopySupportRequest },
            { label: "Open jobs", icon: "briefcase", onClick: () => onOpenModule("jobs") },
            isOfficeUser ? { label: "Open settings", icon: "settings", onClick: () => onOpenModule("settings") } : { label: "Open reports", icon: "document", onClick: () => onOpenModule("reports") },
          ]}
        />
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
