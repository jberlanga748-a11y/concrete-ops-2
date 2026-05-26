import { Badge, Button, Card, Icon, PageHeader, SectionHeader } from "./app-shell-components";
import { canAccessModule, canAccessWorkspaceModule, getDefaultModuleId, getWorkspaceModuleLock } from "./navigation-utils";
import { canRequestPackageReview } from "../shared/permissions.js";
import { packageReadinessSummary } from "../shared/packages.js";

export function AccessRestrictedPage({ active, user, companySettings, permissions, setActive, onOpenSettingsSection, onOpenSupport }) {
  const defaultModuleId = getDefaultModuleId(user);
  const canOpenDefault = canAccessModule(defaultModuleId, user, companySettings);
  const packageLock = getWorkspaceModuleLock(active, user, companySettings, permissions);
  const isPackageLocked = Boolean(packageLock);
  const isAssistantPackageLock = active === "copilot" && isPackageLocked;
  const canReviewPackage = Boolean(isPackageLocked && canAccessWorkspaceModule("settings", user, companySettings, permissions));
  const canRequestUpgradeReview = Boolean(isPackageLocked && canReviewPackage && canRequestPackageReview(user) && canAccessWorkspaceModule("support", user, companySettings, permissions) && typeof onOpenSupport === "function");
  const packageReadiness = isPackageLocked ? packageReadinessSummary(companySettings?.packageId) : null;
  const currentPackageLabel = packageReadiness?.currentPackage?.label || "Basic";
  const requestedPackageLabel = packageLock?.requiredPackage || packageReadiness?.nextPackage?.label || "Premium";
  const assistantLockActions = [
    { id: "commandCenter", label: "Command Center", helper: "Return to the owner/admin operating plan.", icon: "grid" },
    { id: "leads", label: "Leads", helper: "Review follow-ups and office lead work.", icon: "quote" },
    { id: "estimates", label: "Estimates", helper: "Open estimate and proposal workflows.", icon: "document" },
    { id: "support", label: "Support", helper: "Send manual review context if available.", icon: "help" },
  ].filter((action) => canAccessWorkspaceModule(action.id, user, companySettings, permissions));

  function openPackageReadiness() {
    if (typeof onOpenSettingsSection === "function") {
      onOpenSettingsSection("settings-plan-readiness");
      return;
    }
    setActive?.("settings");
  }

  function openUpgradeReview() {
    if (!canRequestUpgradeReview) return;
    onOpenSupport({
      workflow: "Upgrade / package review",
      blockerLevel: "Not a blocker",
      currentPackage: currentPackageLabel,
      requestedPackage: requestedPackageLabel,
      requestedFeature: packageLock?.requestedFeature || packageLock?.title || "Locked feature",
      upgradeReason: `Review access for ${packageLock?.requestedFeature || packageLock?.title || "this locked feature"} from the package-locked route.`,
      summary: `${packageLock?.title || "A package-locked feature"} was opened from ${active}. Please review the manual upgrade path.`,
      expected: "Founder/operator reviews the request manually before any package change. No checkout, invoice, payment collection, or self-serve plan change should happen from Apex HQ.",
      workaround: "Open workspace keeps the user in the included tools while the package review is handled manually.",
    });
  }

  if (isAssistantPackageLock) {
    return (
      <div className="co-office-page co-access-restricted-page co-ai-lock-page">
        <PageHeader
          eyebrow={packageLock?.eyebrow || "Package Locked"}
          title={packageLock?.title || "Apex Assistant is not included"}
          description={packageLock?.description || "Assistant command tools are available in Premium and Elite packages. This workspace can keep using core office and field workflows."}
          actions={<Badge tone="amber">{packageLock?.badge || "Premium package"}</Badge>}
        />
        <div className="co-ai-lock-layout mx-auto grid w-full max-w-[1280px] gap-3 px-5 pb-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:px-8">
          <section className="co-ai-lock-hero">
            <div className="co-ai-lock-hero-copy">
              <div className="co-ai-lock-mark" aria-hidden="true"><Icon name="spark" /></div>
              <div className="min-w-0">
                <span>Review-only assistant path</span>
                <h2>Keep the operator in control until Premium is manually approved.</h2>
                <p>Apex Assistant stays locked for this workspace. Owners and admins can keep running leads, estimates, jobs, reports, and support handoffs without starting checkout, collecting payment, or enabling automation from this page.</p>
              </div>
            </div>

            <div className="co-ai-lock-command-grid">
              <div className="co-ai-lock-command-card" data-tone="orange">
                <span>Current package</span>
                <strong>{currentPackageLabel}</strong>
                <em>Assistant access remains gated by package entitlement.</em>
              </div>
              <div className="co-ai-lock-command-card" data-tone="blue">
                <span>Requested package</span>
                <strong>{requestedPackageLabel}</strong>
                <em>Manual founder/operator review only.</em>
              </div>
              <div className="co-ai-lock-command-card" data-tone="green">
                <span>Core work</span>
                <strong>Available</strong>
                <em>Included workflows stay open and role-safe.</em>
              </div>
            </div>

            <div className="co-ai-lock-actions">
              <Button type="button" onClick={() => canOpenDefault && setActive?.(defaultModuleId)} disabled={!canOpenDefault}>
                Open workspace
              </Button>
              {canReviewPackage ? (
                <Button type="button" variant="secondary" onClick={openPackageReadiness}>
                  {packageLock?.reviewActionLabel || "Review plan readiness"}
                </Button>
              ) : null}
              {canRequestUpgradeReview ? (
                <Button type="button" variant="secondary" onClick={openUpgradeReview}>
                  <Icon name="help" />{packageLock?.supportActionLabel || "Request upgrade review"}
                </Button>
              ) : null}
            </div>

            <div className="co-ai-lock-note">
              <Icon name="alert" />
              <p>{packageLock?.manualUpgradeNote || "AI and assistant upgrades are reviewed manually for now. Apex HQ does not enable automation, package changes, checkout, or billing collection from this page."}</p>
            </div>
          </section>

          <aside className="co-ai-lock-rail">
            <div className="co-ai-lock-rail-card is-dark">
              <div className="flex min-w-0 items-center justify-between gap-3">
                <div className="min-w-0">
                  <p>Assistant Preview</p>
                  <h3>Apex Assistant</h3>
                </div>
                <Badge tone="amber">Locked</Badge>
              </div>
              <div className="co-ai-lock-priority-list">
                <div><span></span><strong>Route office work through existing tools.</strong></div>
                <div><span></span><strong>Request a manual Premium review if needed.</strong></div>
                <div><span></span><strong>Keep field users out of assistant controls.</strong></div>
              </div>
            </div>

            <div className="co-ai-lock-rail-card">
              <SectionHeader title="Included workspaces" description="Use role-safe routes while the assistant stays locked." />
              <div className="grid gap-2">
                {assistantLockActions.map((action) => (
                  <button key={action.id} type="button" className="co-ai-lock-route-row co-focus-ring" onClick={() => setActive?.(action.id)}>
                    <span>
                      <strong>{action.label}</strong>
                      <em>{action.helper}</em>
                    </span>
                    <Icon name={action.icon} />
                  </button>
                ))}
              </div>
            </div>

            <div className="co-ai-lock-rail-card">
              <SectionHeader title="Assistant guardrails" description="What remains protected on this route." />
              <div className="grid gap-2">
                <div className="co-ai-boundary-row" data-state="manual"><span>Automation</span><strong>Locked</strong></div>
                <div className="co-ai-boundary-row" data-state="safe"><span>Field roles</span><strong>Blocked</strong></div>
                <div className="co-ai-boundary-row" data-state="manual"><span>Plan changes</span><strong>Manual</strong></div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="co-office-page co-access-restricted-page">
      <PageHeader
        eyebrow={packageLock?.eyebrow || "Role Protected"}
        title={packageLock?.title || "Workspace unavailable"}
        description={packageLock?.description || "This route is protected for your role. Apex HQ keeps office, admin, AI, and company setup data out of field workspaces."}
        actions={<Badge tone={isPackageLocked ? "amber" : "slate"}>{packageLock?.badge || "Access protected"}</Badge>}
      />
      <div className="mx-auto grid w-full max-w-[960px] gap-4 px-5 sm:px-6 lg:px-8">
        <Card className="p-5">
          <SectionHeader
            title={packageLock?.actionTitle || "Open your allowed workspace"}
            description={packageLock?.actionDescription || "Use the workspace assigned to your role to continue without exposing restricted records."}
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" onClick={() => canOpenDefault && setActive?.(defaultModuleId)} disabled={!canOpenDefault}>
              Open workspace
            </Button>
            {canReviewPackage ? (
              <Button type="button" variant="secondary" onClick={openPackageReadiness}>
                {packageLock?.reviewActionLabel || "Review package readiness"}
              </Button>
            ) : null}
            {canRequestUpgradeReview ? (
              <Button type="button" variant="secondary" onClick={openUpgradeReview}>
                <Icon name="help" />{packageLock?.supportActionLabel || "Request upgrade review"}
              </Button>
            ) : null}
          </div>
          {isPackageLocked ? (
            <p className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2 text-sm font-bold leading-6 text-amber-800">
              {packageLock?.manualUpgradeNote || "Package changes are reviewed manually for now. Core operations remain available."}
            </p>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
