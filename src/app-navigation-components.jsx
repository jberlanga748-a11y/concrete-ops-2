import { Card, Icon } from "./app-shell-components";

export function Sidebar({ active, setActive, counts = {}, navGroups, logoInitials, brandAssets = {}, appName = "Apex HQ" }) {
  void logoInitials;
  const visibleItems = (Array.isArray(navGroups) ? navGroups : []).flatMap((group) => group.items || []);
  const visibleIds = new Set(visibleItems.map((item) => item.id));
  const canOpen = (moduleId) => visibleIds.has(moduleId);
  const firstVisible = (moduleIds) => moduleIds.find((moduleId) => canOpen(moduleId)) || "";
  const anyVisible = (moduleIds) => Boolean(firstVisible(moduleIds));
  const workspaceItems = [
    {
      id: "today",
      label: "Today",
      helper: "Command",
      icon: "grid",
      target: firstVisible(["dashboard"]),
      modules: ["dashboard"],
      count: null,
    },
    {
      id: "field",
      label: "Field",
      helper: "Jobs",
      icon: "briefcase",
      target: firstVisible(["fieldWorkspace", "jobs", "schedule", "time", "reports", "uploads", "deliveryTickets", "prePour", "postPour"]),
      modules: ["fieldWorkspace", "jobs", "schedule", "time", "prePour", "postPour", "incidents", "toolbox", "ppe", "toolChecklist"],
      count: counts.jobs,
    },
    {
      id: "office",
      label: "Office",
      helper: "Customers",
      icon: "inbox",
      target: firstVisible(["commandCenter", "communications", "leads", "customers"]),
      modules: ["commandCenter", "communications", "leads", "customers"],
      count: counts.leads,
    },
    {
      id: "money",
      label: "Estimates",
      helper: "Money",
      icon: "quote",
      target: firstVisible(["estimates", "rateBook", "materialPrep", "changeOrders"]),
      modules: ["estimates", "rateBook", "materialPrep", "changeOrders"],
      count: null,
    },
    {
      id: "proof",
      // When reports and delivery tickets are hidden (fence-pilot simple
      // mode), this workspace is just the photo library -- label it that way.
      label: anyVisible(["reports", "deliveryTickets"]) ? "Field Reports" : "Photos",
      helper: anyVisible(["reports", "deliveryTickets"]) ? "Proof" : "Job photos",
      icon: "upload",
      target: firstVisible(["uploads", "reports", "deliveryTickets", "prePour", "postPour"]),
      modules: ["uploads", "reports", "deliveryTickets"],
      count: canOpen("reports") ? counts.reports : null,
    },
    {
      id: "team",
      label: "Team",
      helper: "Crew",
      icon: "users",
      target: firstVisible(["employees"]),
      modules: ["employees"],
      count: counts.employees,
    },
    {
      id: "system",
      label: "Settings",
      helper: "Setup",
      icon: "settings",
      target: firstVisible(["settings", "support", "appHealth", "calculator"]),
      modules: ["settings", "support", "appHealth", "calculator"],
      count: null,
    },
  ].filter((item) => item.target && anyVisible(item.modules));

  return (
    <aside className="co-sidebar-shell hidden h-screen shrink-0 overflow-hidden border-r text-white lg:sticky lg:top-0 lg:block">
      <div className="co-sidebar-brand-panel border-b border-white/10 px-4 py-4">
        <img className="co-sidebar-brand-logo" src={brandAssets.appLogo} alt={appName} />
        <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Team workspace</p>
      </div>
      <div className="co-sidebar-scroll flex h-[calc(100vh-86px)] flex-col p-3">
        <div className="co-sidebar-workspace-list" aria-label="Workspace navigation">
          {workspaceItems.map((item) => {
            const isActive = item.modules.includes(active);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActive(item.target)}
                className={`co-sidebar-workspace-item ${isActive ? "is-active" : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                <span className="co-sidebar-workspace-icon"><Icon name={item.icon} className="h-4 w-4" /></span>
                <span className="co-sidebar-workspace-copy">
                  <strong>{item.label}</strong>
                  <em>{item.helper}</em>
                </span>
                {item.count ? <span className="co-sidebar-count">{item.count}</span> : null}
              </button>
            );
          })}
        </div>
        <Card variant="shell" className="co-sidebar-status-card p-4">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-300">Live workspace</p>
          <p className="mt-2 text-sm leading-6 text-slate-300">Pick the workspace. The page shows the tools inside it.</p>
        </Card>
      </div>
    </aside>
  );
}
