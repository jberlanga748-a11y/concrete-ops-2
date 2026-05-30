import {
  Badge,
  Button,
  Card,
  Icon,
  SectionHeader,
} from "./app-shell-components";

function normalizeSettingsObjectArray(value, fallback = []) {
  return Array.isArray(value) ? value : fallback;
}

function settingsSetupStatusTone(status) {
  if (status === "Ready for Field Rollout") return "green";
  if (status === "Ready for Managed Use") return "blue";
  if (status === "In Progress") return "amber";
  return "slate";
}

function formatBillingMoney(value = 0) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return "$0";
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  });
}

export function SettingsCommandRailPolished({
  workspaceCompanyName,
  user,
  demoMode,
  demoResetAllowed,
  setupState,
  safeCompanySettings,
  users,
  leadSources,
  jobs,
  showPublicEstimateRequestStatus,
  publicEstimateRequestEnabled,
  busy,
  onReset,
  onNavigate,
  onJump,
  canViewAppHealth = false,
  canViewCustomerPortalPreview = false,
  canViewIntegrationsCommand = false,
}) {
  const activeUsers = normalizeSettingsObjectArray(users).filter((entry) => (entry.status || "active") !== "inactive");
  const activeLeadSources = normalizeSettingsObjectArray(leadSources).filter((source) => !source.archivedAt && (source.status || "active") !== "inactive");
  const activeJobs = normalizeSettingsObjectArray(jobs).filter((job) => !job.archivedAt);
  const setupBlockers = setupState.blockers.slice(0, 4);
  const toolChecklistEnabled = safeCompanySettings.toolChecklistEnabled !== false;

  return (
    <>
      <details className="co-settings-mobile-rail-drawer">
        <summary>
          <span>
            <strong>Settings Console</strong>
            <em>{workspaceCompanyName} / {setupState.status}</em>
          </span>
          <span>
            <Badge tone={settingsSetupStatusTone(setupState.status)}>{setupState.percentComplete}%</Badge>
          </span>
        </summary>
        <div className="co-settings-mobile-rail-panel">
          <div className="co-settings-mobile-rail-strip">
            <div>
              <span>Checklist</span>
              <strong>{setupState.completedCount}/{setupState.totalCount}</strong>
            </div>
            <div>
              <span>Critical</span>
              <strong>{setupState.blockerCount}</strong>
            </div>
            <div>
              <span>Field tools</span>
              <strong>{toolChecklistEnabled ? "On" : "Off"}</strong>
            </div>
          </div>

          <div className="co-settings-mobile-action-grid">
            <button type="button" className="co-settings-action-row" onClick={() => onJump?.("settings-managed-setup")}>
              <span>Review setup readiness</span>
              <Icon name="clipboard" />
            </button>
            <button type="button" className="co-settings-action-row" onClick={() => onJump?.("settings-company-profile")}>
              <span>Update company profile</span>
              <Icon name="settings" />
            </button>
            <button type="button" className="co-settings-action-row" onClick={() => onNavigate?.("employees")}>
              <span>Users / roles</span>
              <Icon name="users" />
            </button>
            <button type="button" className="co-settings-action-row" onClick={() => onJump?.("settings-plan-readiness")}>
              <span>Plan readiness</span>
              <Icon name="dollar" />
            </button>
            {canViewIntegrationsCommand ? <button type="button" className="co-settings-action-row" onClick={() => onJump?.("settings-integrations-command")}>
              <span>Integrations</span>
              <Icon name="layers" />
            </button> : null}
            <button type="button" className="co-settings-action-row" onClick={() => onJump?.("settings-admin-controls")}>
              <span>Field modules / packet text</span>
              <Icon name="document" />
            </button>
            {canViewAppHealth ? <button type="button" className="co-settings-action-row" onClick={() => onJump?.("settings-owner-health")}>
              <span>Backup / owner health</span>
              <Icon name="database" />
            </button> : null}
            {canViewCustomerPortalPreview ? <button type="button" className="co-settings-action-row" onClick={() => onJump?.("settings-customer-portal-preview")}>
              <span>Customer portal preview</span>
              <Icon name="document" />
            </button> : null}
          </div>

          <div className="co-settings-mobile-blocker-stack">
            {setupBlockers.length ? setupBlockers.map((item) => (
              <div key={item.key} className="co-settings-blocker-row">
                <span>{item.label}</span>
                <Badge tone="amber">Critical</Badge>
              </div>
            )) : (
              <div className="co-settings-blocker-row is-clear">
                <span>No critical blockers</span>
                <Badge tone="green">Clear</Badge>
              </div>
            )}
          </div>

          <div className="co-settings-count-grid">
            <div><span>Users</span><strong>{activeUsers.length}</strong></div>
            <div><span>Lead sources</span><strong>{activeLeadSources.length}</strong></div>
            <div><span>Active jobs</span><strong>{activeJobs.length}</strong></div>
            <div><span>Public intake</span><strong>{showPublicEstimateRequestStatus ? (publicEstimateRequestEnabled ? "On" : "Off") : "N/A"}</strong></div>
          </div>

          {demoResetAllowed ? (
            <div className="co-settings-mobile-danger-row">
              <span>Demo reset</span>
              <Button variant="danger" size="sm" onClick={onReset} disabled={busy || typeof onReset !== "function"}>Reset</Button>
            </div>
          ) : null}
        </div>
      </details>

      <div className="co-settings-right-rail space-y-4">
      <Card className="co-settings-rail-card p-4">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Operator Console</p>
            <h3 className="mt-2 break-words text-xl font-black text-slate-950">{workspaceCompanyName}</h3>
            <p className="mt-1 break-words text-xs font-bold text-slate-500">{user?.name || "Unknown user"} / {user?.role || "Unknown role"}</p>
          </div>
          <Badge tone={demoMode ? "amber" : "green"}>{demoMode ? "Demo" : "Live"}</Badge>
        </div>
        <div className="mt-4 grid gap-2">
          <div className="co-settings-rail-row">
            <span>Readiness</span>
            <Badge tone={settingsSetupStatusTone(setupState.status)}>{setupState.status}</Badge>
          </div>
          <div className="co-settings-rail-row">
            <span>Checklist</span>
            <strong>{setupState.completedCount}/{setupState.totalCount}</strong>
          </div>
          <div className="co-settings-rail-row">
            <span>Critical open</span>
            <strong>{setupState.blockerCount}</strong>
          </div>
          <div className="co-settings-rail-row">
            <span>Field tools</span>
            <Badge tone={toolChecklistEnabled ? "green" : "slate"}>{toolChecklistEnabled ? "On" : "Off"}</Badge>
          </div>
        </div>
      </Card>

      <Card className="co-settings-rail-card p-4">
        <SectionHeader title="Quick Setup Actions" description="Jump to the settings area without opening a second route." />
        <div className="grid gap-2">
          <button type="button" className="co-settings-action-row" onClick={() => onJump?.("settings-managed-setup")}>
            <span>Review setup readiness</span>
            <Icon name="clipboard" />
          </button>
          <button type="button" className="co-settings-action-row" onClick={() => onJump?.("settings-company-profile")}>
            <span>Update company profile</span>
            <Icon name="settings" />
          </button>
          <button type="button" className="co-settings-action-row" onClick={() => onNavigate?.("employees")}>
            <span>Users / roles</span>
            <Icon name="users" />
          </button>
          <button type="button" className="co-settings-action-row" onClick={() => onJump?.("settings-plan-readiness")}>
            <span>Plan readiness</span>
            <Icon name="dollar" />
          </button>
          {canViewIntegrationsCommand ? <button type="button" className="co-settings-action-row" onClick={() => onJump?.("settings-integrations-command")}>
            <span>Integrations</span>
            <Icon name="layers" />
          </button> : null}
          <button type="button" className="co-settings-action-row" onClick={() => onJump?.("settings-admin-controls")}>
            <span>Field modules / packet text</span>
            <Icon name="document" />
          </button>
          {canViewAppHealth ? <button type="button" className="co-settings-action-row" onClick={() => onJump?.("settings-owner-health")}>
            <span>Backup / owner health</span>
            <Icon name="database" />
          </button> : null}
          {canViewCustomerPortalPreview ? <button type="button" className="co-settings-action-row" onClick={() => onJump?.("settings-customer-portal-preview")}>
            <span>Customer portal preview</span>
            <Icon name="document" />
          </button> : null}
        </div>
      </Card>

      <Card className="co-settings-rail-card p-4">
        <SectionHeader title="Readiness Blockers" description="Critical setup items that must stay visible." />
        <div className="grid gap-2">
          {setupBlockers.length ? setupBlockers.map((item) => (
            <div key={item.key} className="co-settings-blocker-row">
              <span>{item.label}</span>
              <Badge tone="amber">Critical</Badge>
            </div>
          )) : (
            <div className="co-settings-blocker-row is-clear">
              <span>No critical blockers</span>
              <Badge tone="green">Clear</Badge>
            </div>
          )}
        </div>
      </Card>

      <Card className="co-settings-rail-card p-4">
        <SectionHeader title="Workspace Counts" description="Live workspace scope without exposing field roles to Settings." />
        <div className="co-settings-count-grid">
          <div><span>Users</span><strong>{activeUsers.length}</strong></div>
          <div><span>Lead sources</span><strong>{activeLeadSources.length}</strong></div>
          <div><span>Active jobs</span><strong>{activeJobs.length}</strong></div>
          <div><span>Public intake</span><strong>{showPublicEstimateRequestStatus ? (publicEstimateRequestEnabled ? "On" : "Off") : "N/A"}</strong></div>
        </div>
      </Card>

      {demoResetAllowed ? (
        <Card className="co-settings-rail-card co-settings-danger-card p-4">
          <SectionHeader title="Danger Zone" description="Demo reset stays separated from normal setup work." />
          <Button variant="danger" onClick={onReset} disabled={busy || typeof onReset !== "function"}>Reset demo data</Button>
        </Card>
      ) : null}
      </div>
    </>
  );
}

export function PlanReadinessPanel({ packageReadiness, billingCommand, onOpenSupport }) {
  const currentPackage = packageReadiness?.currentPackage || {};
  const nextPackage = packageReadiness?.nextPackage || null;
  const includedHighlights = (packageReadiness?.includedFeatures || []).filter((feature) => !feature.security).slice(0, 8);
  const securityFeatures = (packageReadiness?.securityFeatures || []).slice(0, 6);
  const upgradeHighlights = (packageReadiness?.upgradeFeatures || []).slice(0, 8);
  const lockedHighlights = (packageReadiness?.lockedFutureFeatures || []).slice(0, 8);
  const providerState = billingCommand?.providerState || {};
  const billingLanes = billingCommand?.workflowLanes || [];
  const billingJobs = billingCommand?.billingJobs || [];
  const billingAudit = billingCommand?.packageAuditTrail || [];
  const receiptStates = billingCommand?.receiptFailureStates || [];
  const blockedActions = billingCommand?.blockedActions || [];
  const canOpenSupport = typeof onOpenSupport === "function";
  const upgradeFeatureLabels = upgradeHighlights.map((feature) => feature.label).join(", ");

  function requestUpgradeReview() {
    if (!canOpenSupport) return;
    onOpenSupport({
      workflow: "Upgrade / package review",
      blockerLevel: "Not a blocker",
      currentPackage: currentPackage.label || "Basic",
      requestedPackage: nextPackage?.label || currentPackage.label || "Current package",
      requestedFeature: upgradeFeatureLabels || "Package readiness review",
      upgradeReason: nextPackage
        ? `Review whether ${nextPackage.label} is the right next package for this workspace based on the locked features and current rollout needs.`
        : "Review whether this workspace needs any manual package or growth-service follow-up.",
      summary: nextPackage
        ? `Please review a manual upgrade path from ${currentPackage.label || "Basic"} to ${nextPackage.label}.`
        : "Please review whether this top-package workspace needs any manual package follow-up.",
      expected: "Founder/operator reviews the request manually before any package change. No checkout, invoice, payment collection, or self-serve plan change should happen from Apex HQ.",
      workaround: "Current package tools remain available while the request is reviewed.",
    });
  }

  function renderFeaturePills(features, tone = "slate") {
    if (!features.length) {
      return <p className="text-sm font-bold leading-6 text-slate-500">No additional gated features remain for this package.</p>;
    }

    return (
      <div className="flex flex-wrap gap-2">
        {features.map((feature) => (
          <Badge key={feature.key} tone={tone}>{feature.label}</Badge>
        ))}
      </div>
    );
  }

  return (
    <Card className="co-settings-console-card p-5">
      <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="blue">{currentPackage.label || "Basic"}</Badge>
            <Badge tone={providerState.configured ? "blue" : "amber"}>{packageReadiness?.billingStatus || "Provider-ready billing"}</Badge>
            {providerState.status ? <Badge tone={providerState.tone || "amber"}>{providerState.status}</Badge> : null}
          </div>
          <h2 className="mt-3 break-words text-base font-black uppercase tracking-[0.04em] text-slate-950">Billing / Payments / Packages Command</h2>
          <p className="mt-1 max-w-3xl break-words text-sm font-bold leading-6 text-slate-600">
            {billingCommand?.summary || packageReadiness?.billingDescription || "Package and billing controls are provider-ready, but live payments and self-serve upgrades remain disabled until the provider is configured."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700">
            {nextPackage ? `Next: ${nextPackage.label}` : "Top package"}
          </div>
          {canOpenSupport ? (
            <Button type="button" size="sm" variant="secondary" onClick={requestUpgradeReview}>
              <Icon name="help" />Request upgrade review
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Current package</p>
          <strong className="mt-2 block text-lg font-black text-slate-950">{currentPackage.label || "Basic"}</strong>
          <span className="mt-1 block text-sm font-bold leading-6 text-slate-600">This workspace keeps the tools already included for the company and user role.</span>
        </div>
        <div className="rounded-2xl border border-orange-100 bg-orange-50/80 p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-orange-700">Next upgrade</p>
          <strong className="mt-2 block text-lg font-black text-slate-950">{nextPackage ? nextPackage.label : "No higher package"}</strong>
          <span className="mt-1 block text-sm font-bold leading-6 text-slate-700">
            {nextPackage ? "Use this panel to explain what unlocks next before a manual package change." : "This workspace already has every current Apex HQ package feature."}
          </span>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-blue-50/80 p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Billing state</p>
          <strong className="mt-2 block text-lg font-black text-slate-950">{providerState.status || "Provider-ready"}</strong>
          <span className="mt-1 block text-sm font-bold leading-6 text-slate-700">Checkout, invoices, payment links, receipts, failed-payment notices, and package changes stay owner/admin reviewed with no live processing from this panel.</span>
        </div>
      </div>

      {billingCommand?.canView ? (
        <>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Package rank</p>
              <strong className="mt-2 block text-lg font-black text-slate-950">{billingCommand.metrics?.packageRank || 1}/{billingCommand.metrics?.packageCount || 3}</strong>
              <span className="mt-1 block text-sm font-bold leading-6 text-slate-600">Current workspace plan</span>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Billing candidates</p>
              <strong className="mt-2 block text-lg font-black text-slate-950">{billingCommand.metrics?.billingReviewCandidates || 0}</strong>
              <span className="mt-1 block text-sm font-bold leading-6 text-slate-600">Jobs ready for manual review</span>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Review total</p>
              <strong className="mt-2 block text-lg font-black text-slate-950">{formatBillingMoney(billingCommand.metrics?.billingReviewTotal)}</strong>
              <span className="mt-1 block text-sm font-bold leading-6 text-slate-600">Estimate plus recognized changes</span>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Audit events</p>
              <strong className="mt-2 block text-lg font-black text-slate-950">{billingCommand.metrics?.packageAuditEvents || 0}</strong>
              <span className="mt-1 block text-sm font-bold leading-6 text-slate-600">Package/billing history visible</span>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
            <SectionHeader title="Payment provider readiness" description={providerState.boundary || "Provider-ready only. No secrets, checkout sessions, or live charges are created here."} />
            <div className="grid gap-3 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={providerState.tone || "amber"}>{providerState.label || "Payment provider"}</Badge>
                  <Badge tone={providerState.configured ? "blue" : "amber"}>{providerState.status || "Needs account/API key"}</Badge>
                  {providerState.testMode ? <Badge tone="green">Sandbox</Badge> : null}
                </div>
                <p className="mt-3 text-sm font-bold leading-6 text-slate-700">{providerState.nextAction || "Configure the provider account before any live billing workflow is enabled."}</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {billingLanes.map((lane) => (
                  <div key={lane.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                    <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                      <strong className="min-w-0 break-words text-sm font-black text-slate-950">{lane.title}</strong>
                      <Badge tone={lane.tone}>{lane.status}</Badge>
                    </div>
                    <p className="mt-2 text-sm font-bold leading-5 text-slate-600">{lane.detail}</p>
                    <p className="mt-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500">{lane.nextAction}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <SectionHeader title="Contractor billing workflow prep" description="Review jobs that are ready for manual billing decisions before a future provider creates invoices, payment links, receipts, or failed-payment follow-up." />
              <div className="grid gap-2">
                {billingJobs.length ? billingJobs.map((job) => (
                  <div key={job.jobId || job.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                      <span className="min-w-0">
                        <strong className="block break-words text-sm font-black text-slate-950">{job.title}</strong>
                        <em className="mt-1 block break-words text-xs font-bold not-italic text-slate-500">{job.customer || "Customer pending"} / {job.status}</em>
                      </span>
                      <strong className="shrink-0 text-sm font-black text-slate-950">{formatBillingMoney(job.reviewTotal)}</strong>
                    </div>
                    <p className="mt-2 text-sm font-bold leading-5 text-slate-600">{job.nextAction}</p>
                  </div>
                )) : (
                  <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold leading-6 text-slate-600">No billing-ready or closed jobs are visible yet. Jobs appear here after closeout proof, estimate revenue, and office review make them candidates.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <SectionHeader title="Receipts / failure states" description="Provider webhook states Apex HQ is ready to model later." />
              <div className="co-ai-scout-checks">
                {receiptStates.map((item) => <small key={item}>{item}</small>)}
              </div>
              <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50/80 p-3">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">Live money boundary</p>
                <p className="mt-2 text-sm font-bold leading-6 text-slate-700">{billingCommand.safetyBoundary}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <SectionHeader title="Package / billing audit" description="Recent package, billing, invoice, checkout, receipt, and payment events that are safe for owner/admin review." />
              <div className="grid gap-2">
                {billingAudit.length ? billingAudit.map((event) => (
                  <div key={event.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <strong className="block break-words text-sm font-black text-slate-950">{event.label}</strong>
                    <span className="mt-1 block break-words text-xs font-bold text-slate-500">{event.actor || "Workspace audit"}{event.at ? ` / ${event.at}` : ""}</span>
                  </div>
                )) : (
                  <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold leading-6 text-slate-600">No package or billing audit events are visible yet. Future provider changes, package reviews, invoices, receipts, and failed-payment events should land here.</p>
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <SectionHeader title="Blocked money actions" description="These stay blocked until a separate provider implementation is configured, tested, audited, and owner-controlled." />
              <div className="co-ai-scout-checks">
                {blockedActions.map((action) => <small key={action}>{action}</small>)}
              </div>
            </div>
          </div>
        </>
      ) : null}

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <SectionHeader title="Included now" description={currentPackage.description || "Features included for the current workspace package."} />
          {renderFeaturePills(includedHighlights, "green")}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <SectionHeader title="Security stays included" description="Auth, role protection, company isolation, demo safety, and health checks are never treated as premium-only features." />
          {renderFeaturePills(securityFeatures, "blue")}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <SectionHeader title={nextPackage ? `${nextPackage.label} adds` : "Upgrade path"} description={nextPackage ? "These are the next package unlocks to explain before billing is built." : "This workspace already has every current package feature."} />
          {renderFeaturePills(upgradeHighlights, "orange")}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <SectionHeader title="Still gated" description="Locked features stay gated by both company package and user role permissions." />
          {renderFeaturePills(lockedHighlights, "amber")}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-orange-100 bg-orange-50/70 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-orange-700">Manual upgrade handoff</p>
            <p className="mt-2 max-w-3xl text-sm font-bold leading-6 text-slate-700">
              Use Support to copy a review request with workspace, role, current package, requested package, and feature context. Apex HQ will not change the package or collect payment from this panel.
            </p>
          </div>
          {canOpenSupport ? (
            <Button type="button" size="sm" onClick={requestUpgradeReview}>
              <Icon name="clipboard" />Copy request context
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

export function IntegrationsCommandPanel({ state, onOpenSupport }) {
  const command = state || {};
  const providerRows = normalizeSettingsObjectArray(command.providerRows);
  const builtAdapters = normalizeSettingsObjectArray(command.builtAdapters);
  const readinessControls = normalizeSettingsObjectArray(command.readinessControls);
  const auditTrail = normalizeSettingsObjectArray(command.integrationAuditTrail);
  const blockedActions = normalizeSettingsObjectArray(command.blockedActions);
  const canOpenSupport = typeof onOpenSupport === "function";

  function requestIntegrationReview(provider = null) {
    if (!canOpenSupport) return;
    onOpenSupport({
      workflow: "Integration provider setup",
      blockerLevel: "Provider-dependent",
      requestedFeature: provider?.label || "Platform integrations",
      summary: provider
        ? `Please review provider setup for ${provider.label}.`
        : "Please review provider-ready integrations setup for this workspace.",
      expected: "Founder/operator confirms provider account, secrets path, sandbox verification, audit trail, disabled state, disconnect control, and owner/admin execution before any live integration write.",
      workaround: "Keep existing manual import, public intake, and review-first workflows active while provider setup is reviewed.",
    });
  }

  if (!command.canView) {
    return (
      <Card className="co-settings-console-card p-5">
        <SectionHeader title="Integrations Command unavailable" description={command.summary || "Only owner/admin users can review integration provider setup."} />
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold leading-6 text-slate-600">
          {command.safetyBoundary || "Field users cannot access integration provider context."}
        </div>
      </Card>
    );
  }

  return (
    <Card className="co-settings-console-card p-5">
      <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={command.integrationsEntitled ? "blue" : "slate"}>{command.currentPackage?.label || "Package"}</Badge>
            <Badge tone={command.integrationsEntitled ? "blue" : "amber"}>{command.integrationsEntitled ? "Provider-ready" : "Package-dependent"}</Badge>
            <Badge tone="amber">Live writes locked</Badge>
          </div>
          <h2 className="mt-3 break-words text-base font-black uppercase tracking-[0.04em] text-slate-950">Integrations Command</h2>
          <p className="mt-1 max-w-3xl break-words text-sm font-bold leading-6 text-slate-600">
            {command.summary || "Provider-ready integrations are organized for owner/admin review without live external writes."}
          </p>
        </div>
        {canOpenSupport ? (
          <Button type="button" size="sm" variant="secondary" onClick={() => requestIntegrationReview()}>
            <Icon name="help" />Request setup review
          </Button>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Providers tracked</p>
          <strong className="mt-2 block text-lg font-black text-slate-950">{command.metrics?.providersTracked || 0}</strong>
          <span className="mt-1 block text-sm font-bold leading-6 text-slate-600">Core contractor tools mapped</span>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-blue-50/80 p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Provider-ready</p>
          <strong className="mt-2 block text-lg font-black text-slate-950">{command.metrics?.providerReady || 0}</strong>
          <span className="mt-1 block text-sm font-bold leading-6 text-slate-700">Configured metadata only</span>
        </div>
        <div className="rounded-2xl border border-orange-100 bg-orange-50/80 p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-orange-700">Needs setup</p>
          <strong className="mt-2 block text-lg font-black text-slate-950">{command.metrics?.needsSetup || 0}</strong>
          <span className="mt-1 block text-sm font-bold leading-6 text-slate-700">Account/API key dependent</span>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50/80 p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">External writes</p>
          <strong className="mt-2 block text-lg font-black text-slate-950">Locked</strong>
          <span className="mt-1 block text-sm font-bold leading-6 text-slate-700">No live provider actions</span>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
        <SectionHeader title="Provider readiness board" description="Each integration has visible setup, health, disabled state, audit, disconnect, and server-side secret boundaries." />
        <div className="grid gap-3 xl:grid-cols-3">
          {providerRows.map((provider) => (
            <div key={provider.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <strong className="block break-words text-sm font-black text-slate-950">{provider.label}</strong>
                  <span className="mt-1 block break-words text-xs font-bold text-slate-500">{provider.category} / {provider.direction}</span>
                </div>
                <Badge tone={provider.tone || "slate"}>{provider.status}</Badge>
              </div>
              <p className="mt-3 text-sm font-bold leading-6 text-slate-700">{provider.summary}</p>
              <div className="mt-3 grid gap-2 text-xs font-bold text-slate-600">
                <span>Health: {provider.providerHealth}</span>
                <span>Server adapter: {provider.serverAdapter}</span>
                <span>Credential: {provider.credentialReference || "Server-side setup required"}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone={provider.noFrontendSecrets ? "green" : "red"}>No frontend secrets</Badge>
                <Badge tone={provider.liveWriteLocked ? "amber" : "red"}>Writes locked</Badge>
                <Badge tone={provider.disconnectControl ? "blue" : "slate"}>Disconnect planned</Badge>
              </div>
              <p className="mt-3 text-sm font-bold leading-6 text-slate-700">{provider.nextAction}</p>
              {canOpenSupport ? (
                <Button type="button" size="sm" variant="secondary" className="mt-3" onClick={() => requestIntegrationReview(provider)}>
                  <Icon name="clipboard" />Review provider
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <SectionHeader title="Built inbound contracts" description="Existing systems that should be reused rather than rebuilt." />
          <div className="grid gap-2">
            {builtAdapters.map((adapter) => (
              <div key={adapter.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <strong className="break-words text-sm font-black text-slate-950">{adapter.label}</strong>
                  <Badge tone={adapter.tone || "slate"}>{adapter.status}</Badge>
                </div>
                <p className="mt-2 text-sm font-bold leading-6 text-slate-600">{adapter.detail}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <SectionHeader title="Required controls" description="Every provider must keep the same safety shape before live use." />
          <div className="co-ai-scout-checks">
            {readinessControls.map((control) => <small key={control.label}>{control.label}</small>)}
          </div>
          <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50/80 p-3">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">Integration write boundary</p>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-700">{command.safetyBoundary}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <SectionHeader title="Integration audit" description="Provider, OAuth, health, disconnect, and integration-write events safe for owner/admin review." />
          <div className="grid gap-2">
            {auditTrail.length ? auditTrail.map((event) => (
              <div key={event.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <strong className="block break-words text-sm font-black text-slate-950">{event.label}</strong>
                <span className="mt-1 block break-words text-xs font-bold text-slate-500">{event.actor || "Workspace audit"}{event.at ? ` / ${event.at}` : ""}</span>
              </div>
            )) : (
              <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold leading-6 text-slate-600">No integration audit events are visible yet. Future provider setup, health checks, disables, reconnects, OAuth reviews, and sandbox checks should land here.</p>
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <SectionHeader title="Blocked integration actions" description="These stay blocked until provider accounts, secrets, sandbox tests, audit, disconnect, and owner/admin execution controls are finished." />
          <div className="co-ai-scout-checks">
            {blockedActions.map((action) => <small key={action}>{action}</small>)}
          </div>
        </div>
      </div>
    </Card>
  );
}
