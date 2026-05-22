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

export function PlanReadinessPanel({ packageReadiness, onOpenSupport }) {
  const currentPackage = packageReadiness?.currentPackage || {};
  const nextPackage = packageReadiness?.nextPackage || null;
  const includedHighlights = (packageReadiness?.includedFeatures || []).filter((feature) => !feature.security).slice(0, 8);
  const securityFeatures = (packageReadiness?.securityFeatures || []).slice(0, 6);
  const upgradeHighlights = (packageReadiness?.upgradeFeatures || []).slice(0, 8);
  const lockedHighlights = (packageReadiness?.lockedFutureFeatures || []).slice(0, 8);
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
            <Badge tone="amber">{packageReadiness?.billingStatus || "Manual billing only"}</Badge>
          </div>
          <h2 className="mt-3 break-words text-base font-black uppercase tracking-[0.04em] text-slate-950">Plan Readiness</h2>
          <p className="mt-1 max-w-3xl break-words text-sm font-bold leading-6 text-slate-600">
            {packageReadiness?.billingDescription || "Plan controls are read-only until billing and self-serve upgrades are intentionally built."}
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
          <strong className="mt-2 block text-lg font-black text-slate-950">Manual review</strong>
          <span className="mt-1 block text-sm font-bold leading-6 text-slate-700">No self-serve plan changes, invoices, payment collection, checkout, or Stripe billing are active in this workspace.</span>
        </div>
      </div>

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
