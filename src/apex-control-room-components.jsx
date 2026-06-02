import { Badge, Button, Card, Icon, PageHeader, SectionHeader } from "./app-shell-components";
import { deriveApexControlRoomState } from "./apex-control-room-utils";

function ToneBadge({ children, tone = "slate" }) {
  return <Badge tone={tone}>{children}</Badge>;
}

function KpiTile({ item }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-[0_14px_34px_-30px_rgba(7,17,31,0.5)]">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <p className="min-w-0 break-words text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">{item.label}</p>
        <ToneBadge tone={item.tone}>{item.value}</ToneBadge>
      </div>
      <p className="mt-3 min-w-0 break-words text-sm font-bold leading-5 text-slate-600">{item.detail}</p>
    </div>
  );
}

function StatusRow({ item }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="break-words text-sm font-black text-slate-950">{item.title}</p>
          <p className="mt-1 break-words text-xs font-bold leading-5 text-slate-600">{item.detail}</p>
        </div>
        <ToneBadge tone={item.tone}>{item.status}</ToneBadge>
      </div>
    </div>
  );
}

function ApprovalRow({ item }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 border-b border-slate-100 py-2 last:border-b-0">
      <p className="min-w-0 break-words text-sm font-black text-slate-800">{item.label}</p>
      <span className="max-w-[52%] rounded-lg bg-amber-50 px-2.5 py-1 text-right text-[11px] font-black leading-4 text-amber-800 ring-1 ring-amber-200">{item.status}</span>
    </div>
  );
}

function EvidenceRow({ item }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="break-words text-sm font-black text-slate-950">{item.title}</p>
      {item.meta ? <p className="mt-1 break-words text-xs font-bold text-slate-500">{item.meta}</p> : null}
    </div>
  );
}

function MemoryRow({ item }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="break-words text-[10px] font-black uppercase tracking-[0.16em] text-orange-700">{item.category || "Operating rule"}</p>
          <p className="mt-1 break-words text-sm font-black text-slate-950">{item.title}</p>
          <p className="mt-1 break-words text-xs font-bold leading-5 text-slate-600">{item.detail}</p>
          {item.source || item.sourceLabel ? <p className="mt-2 break-words text-[11px] font-black text-slate-500">Source: {item.sourceLabel || item.source}</p> : null}
        </div>
        <ToneBadge tone={item.tone}>{item.status}</ToneBadge>
      </div>
    </div>
  );
}

function EmptyPanel({ children }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm font-bold text-slate-600">
      {children}
    </div>
  );
}

export function ApexControlRoomPage(props) {
  const state = deriveApexControlRoomState(props);

  return (
    <div className="min-w-0 max-w-full bg-slate-100 pb-8">
      <PageHeader
        eyebrow="Apex OS"
        title="Apex Control Room"
        description={`Private Apex HQ operating center for ${state.operatorName}.`}
        actions={(
          <div className="flex min-w-0 flex-wrap gap-2">
            <ToneBadge tone={state.canView ? "green" : "red"}>{state.canView ? "Private operator" : "Restricted"}</ToneBadge>
            <ToneBadge tone="amber">No deploy</ToneBadge>
            <ToneBadge tone="slate">No provider changes</ToneBadge>
          </div>
        )}
      />

      <main className="mx-auto flex w-full max-w-[1520px] flex-col gap-4 px-4 sm:px-6">
        <section className="grid min-w-0 grid-cols-2 gap-3 xl:grid-cols-4">
          {state.kpis.map((item) => <KpiTile key={item.id} item={item} />)}
        </section>

        <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader
              title="Apex Briefing"
              description={state.summary}
              action={<span className="inline-flex h-9 items-center rounded-xl bg-slate-950 px-3 text-xs font-black text-white"><Icon name="spark" className="mr-2 h-4 w-4" />Slice 3 memory</span>}
            />
            <div className="grid min-w-0 gap-3 lg:grid-cols-2 2xl:grid-cols-4">
              {state.priorities.map((item) => <StatusRow key={item.id} item={item} />)}
            </div>
          </Card>

          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader title="Approval Gates" description="Risky actions stay locked behind John approval." />
            <div className="min-w-0">
              {state.approvals.map((item) => <ApprovalRow key={item.id} item={item} />)}
            </div>
          </Card>
        </section>

        <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader
              title="Approval Command Center"
              description={`${state.approvalCommandCenter.queueCount || 0} risky-action categories require scoped John approval packets.`}
              action={<ToneBadge tone={state.approvalCommandCenter.tone}>{state.approvalCommandCenter.status}</ToneBadge>}
            />
            <div className="grid min-w-0 gap-3 lg:grid-cols-2">
              {state.approvalCommandCenter.queueRows.map((item) => <StatusRow key={item.id} item={item} />)}
            </div>
          </Card>

          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader title="Approval Packet" description={`${state.approvalCommandCenter.packetFieldCount || 0} fields required before risky work can be approved.`} />
            <div className="grid min-w-0 gap-3">
              {state.approvalCommandCenter.packetRows.map((item) => <StatusRow key={item.id} item={item} />)}
            </div>
          </Card>
        </section>

        <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader title="Approval Controls" description="Visible control model only; no approval writes or execution exist yet." />
            <div className="grid min-w-0 gap-3">
              {state.approvalCommandCenter.controlRows.map((item) => <StatusRow key={item.id} item={item} />)}
            </div>
            <div className="mt-4 flex min-w-0 flex-wrap gap-2">
              <Button type="button" disabled variant="secondary" size="sm">
                <Icon name="check" /> Approve
              </Button>
              <Button type="button" disabled variant="secondary" size="sm">
                <Icon name="alert" /> Reject
              </Button>
              <Button type="button" disabled variant="secondary" size="sm">
                <Icon name="clock" /> Defer
              </Button>
              <Button type="button" disabled variant="secondary" size="sm">
                <Icon name="lock" /> Execute locked
              </Button>
            </div>
          </Card>

          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader title="Approval Sources" description={`${state.approvalCommandCenter.sourceCount || 0} surfaces feeding approval packets.`} />
            <div className="grid min-w-0 gap-3">
              {state.approvalCommandCenter.sourceRows.map((item) => <StatusRow key={item.id} item={item} />)}
            </div>
          </Card>
        </section>

        <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader title="Operating Signals" description="Read-only state pulled from current Apex HQ systems." />
            <div className="grid min-w-0 gap-3 lg:grid-cols-2">
              {state.operatingSignals.map((item) => <StatusRow key={item.id} item={item} />)}
            </div>
          </Card>

          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader title="Next Best Actions" description="Private owner actions for the next controlled build step." />
            <div className="grid min-w-0 gap-3">
              {state.nextBestActions.map((item) => <StatusRow key={item.id} item={item} />)}
            </div>
          </Card>
        </section>

        <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader
              title="Release Monitoring"
              description={`${state.releaseMonitoring.readinessCount || 0} release and monitoring checks are mapped for private review.`}
              action={<ToneBadge tone={state.releaseMonitoring.tone}>{state.releaseMonitoring.status}</ToneBadge>}
            />
            <div className="grid min-w-0 gap-3 lg:grid-cols-2">
              {state.releaseMonitoring.readinessRows.map((item) => <StatusRow key={item.id} item={item} />)}
            </div>
          </Card>

          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader title="Daily Briefing" description={`${state.releaseMonitoring.briefingCount || 0} briefing rows for John-only review.`} />
            <div className="grid min-w-0 gap-3">
              {state.releaseMonitoring.briefingRows.map((item) => <StatusRow key={item.id} item={item} />)}
            </div>
          </Card>
        </section>

        <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader title="Release Readiness Packet" description={`${state.releaseMonitoring.packetCount || 0} packet rows before any release approval.`} />
            <div className="grid min-w-0 gap-3 lg:grid-cols-2">
              {state.releaseMonitoring.releasePacketRows.map((item) => <StatusRow key={item.id} item={item} />)}
            </div>
          </Card>

          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader title="Monitoring Locks" description="Monitoring is read-only until provider and deploy approval exists." />
            <div className="grid min-w-0 gap-3">
              {state.releaseMonitoring.lockRows.map((item) => <StatusRow key={item.id} item={item} />)}
            </div>
          </Card>
        </section>

        <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader
              title="Business Command Center"
              description={`${state.businessCommandCenter.queueCount || 0} private business queues for Apex HQ growth and launch work.`}
              action={<ToneBadge tone={state.businessCommandCenter.tone}>{state.businessCommandCenter.status}</ToneBadge>}
            />
            <div className="grid min-w-0 gap-3 lg:grid-cols-2">
              {state.businessCommandCenter.queueRows.map((item) => <StatusRow key={item.id} item={item} />)}
            </div>
          </Card>

          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader title="Business Gates" description={`${state.businessCommandCenter.gateCount || 0} gates keep business actions manual.`} />
            <div className="grid min-w-0 gap-3">
              {state.businessCommandCenter.gateRows.map((item) => <StatusRow key={item.id} item={item} />)}
            </div>
          </Card>
        </section>

        <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader title="Launch / Founder Demo" description={`${state.businessCommandCenter.launchCount || 0} launch and founder-led demo readiness rows.`} />
            <div className="grid min-w-0 gap-3">
              {state.businessCommandCenter.launchRows.map((item) => <StatusRow key={item.id} item={item} />)}
            </div>
          </Card>

          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader title="Business Briefing" description={`${state.businessCommandCenter.briefingCount || 0} John-only business briefing rows.`} />
            <div className="grid min-w-0 gap-3">
              {state.businessCommandCenter.briefingRows.map((item) => <StatusRow key={item.id} item={item} />)}
            </div>
          </Card>
        </section>

        <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader
              title="QA / Security Hardening"
              description={`${state.qaSecurityHardening.evidenceCount || 0} final hardening rows before Apex OS is treated as complete.`}
              action={<ToneBadge tone={state.qaSecurityHardening.tone}>{state.qaSecurityHardening.status}</ToneBadge>}
            />
            <div className="grid min-w-0 gap-3 lg:grid-cols-2">
              {state.qaSecurityHardening.evidenceRows.map((item) => <StatusRow key={item.id} item={item} />)}
            </div>
          </Card>

          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader title="Hardening Locks" description={`${state.qaSecurityHardening.lockCount || 0} action classes stay approval-locked.`} />
            <div className="grid min-w-0 gap-3">
              {state.qaSecurityHardening.lockRows.map((item) => <StatusRow key={item.id} item={item} />)}
            </div>
          </Card>
        </section>

        <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader title="Completion Audit" description="What has to be proven before the active Apex OS goal can be closed." />
            <div className="grid min-w-0 gap-3">
              <StatusRow item={{
                id: "completion-local",
                title: "Local completion",
                status: state.qaSecurityHardening.status,
                detail: "The Apex OS surfaces are built locally as first UI slices; final completion depends on tests, build, route checks, mobile checks, and docs being current.",
                tone: state.qaSecurityHardening.tone,
              }} />
              <StatusRow item={{
                id: "completion-production",
                title: "Production / provider boundary",
                status: "Approval required",
                detail: "Deploys, provider/API work, speech, live monitoring, durable memory, customer-visible changes, and production mutations remain outside this local completion pass.",
                tone: "amber",
              }} />
            </div>
          </Card>

          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader title="Security Proof Sources" description="The private surfaces feeding this hardening pass." />
            <div className="grid min-w-0 gap-3 lg:grid-cols-2">
              <StatusRow item={{
                id: "proof-ask-apex",
                title: "Ask Apex / Knowledge Vault",
                status: "Read-only",
                detail: "Chat, evidence, and vault categories are mapped without provider calls, uploads, storage, embeddings, or trusted memory writes.",
                tone: "blue",
              }} />
              <StatusRow item={{
                id: "proof-voice-approval",
                title: "Voice / Approval Center",
                status: "Locked",
                detail: "Voice controls are disabled and approval controls are visual only, so risky spoken or clicked actions cannot execute.",
                tone: "amber",
              }} />
            </div>
          </Card>
        </section>

        <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader
              title="Decision Memory"
              description={`What John decided. ${state.decisionMemory.decisionCount || 0} decisions are visible from the saved Apex OS plan.`}
              action={<ToneBadge tone={state.decisionMemory.tone}>{state.decisionMemory.status}</ToneBadge>}
            />
            <div className="grid min-w-0 gap-3 lg:grid-cols-2">
              {state.decisionMemory.decisions.map((item) => <MemoryRow key={item.id} item={item} />)}
            </div>
          </Card>

          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader
              title="Operating Rules"
              description="Current Apex OS boundaries before editable memory exists."
            />
            <div className="grid min-w-0 gap-3">
              {state.decisionMemory.rules.map((item) => <MemoryRow key={item.id} item={item} />)}
            </div>
          </Card>
        </section>

        <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader
              title="Agent Work Queue"
              description={`${state.agentWorkQueue.availableTaskCount || 0} review-only task types across ${state.agentWorkQueue.visibleTargetCount || 0} visible targets.`}
              action={<ToneBadge tone={state.agentWorkQueue.tone}>{state.agentWorkQueue.status}</ToneBadge>}
            />
            {state.agentWorkQueue.taskRows.length ? (
              <div className="grid min-w-0 gap-3 lg:grid-cols-2">
                {state.agentWorkQueue.taskRows.map((item) => <StatusRow key={item.id} item={item} />)}
              </div>
            ) : (
              <EmptyPanel>No review-only agent tasks are available for visible records.</EmptyPanel>
            )}
          </Card>

          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader
              title="Agent Run Ledger"
              description={`${state.agentWorkQueue.recentRunCount || 0} recent audit-backed run rows.`}
            />
            {state.agentWorkQueue.runRows.length ? (
              <div className="grid min-w-0 gap-3">
                {state.agentWorkQueue.runRows.map((item) => <StatusRow key={item.id} item={item} />)}
              </div>
            ) : (
              <EmptyPanel>No recent Agent OS run rows are visible yet.</EmptyPanel>
            )}
          </Card>
        </section>

        <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader title="Agent Safety Locks" description="What this queue still cannot do." />
            <div className="grid min-w-0 gap-3">
              {state.agentWorkQueue.safetyRows.map((item) => <StatusRow key={item.id} item={item} />)}
            </div>
          </Card>

          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader
              title="Locked Agent Tasks"
              description={`${state.agentWorkQueue.lockedTaskCount || 0} task types are locked or have no visible targets.`}
            />
            {state.agentWorkQueue.lockedRows.length ? (
              <div className="grid min-w-0 gap-3 lg:grid-cols-2">
                {state.agentWorkQueue.lockedRows.map((item) => <StatusRow key={item.id} item={item} />)}
              </div>
            ) : (
              <EmptyPanel>No locked agent task rows are visible.</EmptyPanel>
            )}
          </Card>
        </section>

        <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader
              title="Knowledge Vault"
              description={`${state.knowledgeVault.categoryCount || 0} private knowledge categories are mapped before upload/storage approval.`}
              action={<ToneBadge tone={state.knowledgeVault.tone}>{state.knowledgeVault.status}</ToneBadge>}
            />
            <div className="grid min-w-0 gap-3 lg:grid-cols-2">
              {state.knowledgeVault.categories.slice(0, 6).map((item) => <StatusRow key={item.id} item={item} />)}
            </div>
          </Card>

          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader title="Vault Safety Gates" description="Upload and trusted-memory boundaries." />
            <div className="grid min-w-0 gap-3">
              {state.knowledgeVault.safetyRows.map((item) => <StatusRow key={item.id} item={item} />)}
            </div>
          </Card>
        </section>

        <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader title="Vault Sources" description={`${state.knowledgeVault.sourceCount || 0} current source candidates.`} />
            <div className="grid min-w-0 gap-3">
              {state.knowledgeVault.sourceRows.map((item) => <StatusRow key={item.id} item={item} />)}
            </div>
          </Card>

          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader title="Vault Intake Status" description="What is intentionally not active yet." />
            <div className="grid min-w-0 gap-3 lg:grid-cols-2">
              <StatusRow item={{
                id: "upload-intake",
                title: "Upload intake",
                status: "Locked",
                detail: "No files are uploaded, parsed, stored, trusted, embedded, or sent to a provider from this surface.",
                tone: "amber",
              }} />
              <StatusRow item={{
                id: "trusted-memory",
                title: "Trusted memory",
                status: "Approval required",
                detail: "A later storage slice must add review status, source metadata, archive controls, and secret screening before knowledge becomes durable.",
                tone: "amber",
              }} />
            </div>
          </Card>
        </section>

        <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader
              title="Ask Apex"
              description="Private source-backed chat shell for app, roadmap, agents, business, and launch questions."
              action={<ToneBadge tone={state.askApexChat.tone}>{state.askApexChat.status}</ToneBadge>}
            />
            <div className="grid min-w-0 gap-4">
              <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {state.askApexChat.contexts.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    disabled
                    className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left opacity-90"
                    title={`${item.title}: ${item.status}`}
                  >
                    <span className="block break-words text-sm font-black text-slate-950">{item.title}</span>
                    <span className="mt-1 block break-words text-xs font-bold leading-5 text-slate-600">{item.detail}</span>
                    <span className="mt-2 inline-flex"><ToneBadge tone={item.tone}>{item.status}</ToneBadge></span>
                  </button>
                ))}
              </div>

              <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
                <label className="sr-only" htmlFor="ask-apex-input">Ask Apex</label>
                <textarea
                  id="ask-apex-input"
                  disabled
                  value=""
                  placeholder={state.askApexChat.placeholder}
                  className="min-h-28 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold leading-6 text-slate-700 placeholder:text-slate-500 disabled:cursor-not-allowed"
                />
                <div className="mt-3 flex min-w-0 flex-wrap gap-2">
                  <Button type="button" disabled variant="secondary" size="sm">
                    <Icon name="spark" /> Ask Apex
                  </Button>
                  <Button type="button" disabled variant="secondary" size="sm">
                    <Icon name="clipboard" /> Evidence used
                  </Button>
                  <Button type="button" disabled variant="secondary" size="sm">
                    <Icon name="lock" /> Provider locked
                  </Button>
                </div>
              </div>

              <StatusRow item={state.askApexChat.answerPreview} />
            </div>
          </Card>

          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader title="Ask Apex Actions" description="Chat actions are visible now but cannot write or execute yet." />
            <div className="grid min-w-0 gap-3">
              {state.askApexChat.actionLocks.map((item) => <StatusRow key={item.id} item={item} />)}
            </div>
          </Card>
        </section>

        <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader
              title="Ask Apex Evidence"
              description={`${state.askApexChat.evidenceCount || 0} current source rows available before provider integration.`}
            />
            <div className="grid min-w-0 gap-3">
              {state.askApexChat.evidenceRows.slice(0, 4).map((item) => <StatusRow key={item.id} item={item} />)}
            </div>
          </Card>

          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader title="Source-Backed Answer Rules" description="Answer quality gates before Ask Apex can become live." />
            <div className="grid min-w-0 gap-3 lg:grid-cols-2">
              <StatusRow item={{
                id: "source-labels",
                title: "Source labels",
                status: "Required",
                detail: "Answers about the app, launch, agents, business, or decisions must show the source rows used.",
                tone: "blue",
              }} />
              <StatusRow item={{
                id: "risk-labels",
                title: "Risk labels",
                status: "Locked",
                detail: "Anything involving deploy, provider/API, production, customer-visible work, money, sends, or deletion must be marked approval-needed.",
                tone: "amber",
              }} />
            </div>
          </Card>
        </section>

        <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader
              title="Voice Interface"
              description="Private talk/listen planning surface with microphone, speech provider, and always-listening locked."
              action={<ToneBadge tone={state.voiceInterface.tone}>{state.voiceInterface.status}</ToneBadge>}
            />
            <div className="grid min-w-0 gap-4">
              <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                <div className="flex min-h-44 min-w-0 flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                  <button
                    type="button"
                    disabled
                    className="inline-flex h-20 w-20 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500 shadow-[0_16px_34px_-28px_rgba(7,17,31,0.5)] disabled:cursor-not-allowed"
                    title="Microphone access is locked"
                  >
                    <Icon name="phone" className="h-8 w-8" />
                  </button>
                  <p className="mt-3 break-words text-sm font-black text-slate-950">{state.voiceInterface.prompt}</p>
                  <p className="mt-1 break-words text-xs font-bold leading-5 text-slate-600">{state.voiceInterface.providerStatus}</p>
                </div>
                <div className="grid min-w-0 gap-3">
                  <StatusRow item={{
                    id: "voice-transcript-preview",
                    title: "Transcript preview",
                    status: state.voiceInterface.transcriptStatus,
                    detail: state.voiceInterface.transcriptPreview,
                    tone: "blue",
                  }} />
                  <StatusRow item={{
                    id: "voice-answer-preview",
                    title: "Spoken answer preview",
                    status: state.voiceInterface.answerStatus,
                    detail: state.voiceInterface.answerPreview,
                    tone: "amber",
                  }} />
                </div>
              </div>
              <div className="flex min-w-0 flex-wrap gap-2">
                <Button type="button" disabled variant="secondary" size="sm">
                  <Icon name="phone" /> Push to talk
                </Button>
                <Button type="button" disabled variant="secondary" size="sm">
                  <Icon name="clipboard" /> Confirm transcript
                </Button>
                <Button type="button" disabled variant="secondary" size="sm">
                  <Icon name="lock" /> Speech locked
                </Button>
              </div>
            </div>
          </Card>

          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader title="Voice Safety Gates" description={`${state.voiceInterface.safetyCount || 0} voice boundaries before provider work.`} />
            <div className="grid min-w-0 gap-3">
              {state.voiceInterface.safetyRows.map((item) => <StatusRow key={item.id} item={item} />)}
            </div>
          </Card>
        </section>

        <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader title="Voice Modes" description={`${state.voiceInterface.modeCount || 0} planned modes for the talk/listen experience.`} />
            <div className="grid min-w-0 gap-3 lg:grid-cols-2">
              {state.voiceInterface.modes.map((item) => <StatusRow key={item.id} item={item} />)}
            </div>
          </Card>

          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader title="Voice Approval Boundary" description="Voice stays manual and private until speech/provider approval exists." />
            <div className="grid min-w-0 gap-3 lg:grid-cols-2">
              <StatusRow item={{
                id: "voice-risk-review",
                title: "Risky spoken commands",
                status: "John approval required",
                detail: "A spoken request cannot deploy, send, spend, publish, change providers, touch production data, or delete anything.",
                tone: "amber",
              }} />
              <StatusRow item={{
                id: "voice-privacy-review",
                title: "Privacy review",
                status: "Required",
                detail: "Microphone permission, transcript retention, audio handling, and always-listening controls need separate review.",
                tone: "blue",
              }} />
            </div>
          </Card>
        </section>

        <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader
              title="Launch Readiness"
              description={`${state.launchReadiness.readyCount || 0} of ${state.launchReadiness.totalCount || 0} gates ready.`}
              action={<ToneBadge tone={state.launchReadiness.tone}>{state.launchReadiness.status}</ToneBadge>}
            />
            <div className="grid min-w-0 gap-3">
              {state.launchReadiness.gates.map((item) => <StatusRow key={item.id} item={item} />)}
            </div>
          </Card>

          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader
              title="Release Desk"
              description="Manual deploy safety, rollback, and stop-warning summary."
              action={<ToneBadge tone={state.releaseDesk.tone}>{state.releaseDesk.status}</ToneBadge>}
            />
            <div className="grid min-w-0 gap-3">
              {state.releaseDesk.sections.map((item) => <StatusRow key={item.id} item={item} />)}
            </div>
          </Card>
        </section>

        <section className="grid min-w-0 gap-4 xl:grid-cols-2">
          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader title="Agent Control" description="Read-only agent posture for the first slice." />
            <div className="grid min-w-0 gap-3">
              {state.agents.map((item) => <StatusRow key={item.id} item={item} />)}
            </div>
          </Card>

          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader title="Recent Evidence" description="Current audit signal available to Apex OS." />
            {state.evidence.length ? (
              <div className="grid min-w-0 gap-3">
                {state.evidence.map((item) => <EvidenceRow key={item.id} item={item} />)}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm font-bold text-slate-600">
                No recent evidence rows are visible for this workspace.
              </div>
            )}
          </Card>
        </section>
      </main>
    </div>
  );
}
