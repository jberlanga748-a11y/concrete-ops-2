import { useEffect, useState } from "react";

import { Badge, Icon } from "./app-shell-components";

export function FieldActionGrid({ actions, onOpen }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {actions.map((action) => {
        const canOpen = Boolean(action.moduleId);
        return (
          <button
            key={action.title}
            type="button"
            onClick={() => canOpen ? onOpen(action.moduleId) : undefined}
            disabled={!canOpen}
            aria-disabled={!canOpen}
            className={`rounded-3xl border border-blue-100 bg-white p-4 text-left transition ${
              canOpen
                ? "hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/50"
                : "cursor-not-allowed opacity-70"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${canOpen ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-400"}`}>
                <Icon name={action.icon} className="h-5 w-5" />
              </div>
              <Badge tone={action.tone || "slate"}>{action.badge || "Ready"}</Badge>
            </div>
            <p className="mt-4 text-base font-black text-slate-950">{action.title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{action.description}</p>
          </button>
        );
      })}
    </div>
  );
}

const FIELD_MOBILE_NAV_ORDER = [
  { id: "jobs", label: "Jobs", icon: "briefcase" },
  { id: "time", label: "Clock", icon: "clock" },
  { id: "reports", label: "Reports", icon: "document" },
  { id: "prePour", label: "Pre-Pour", icon: "clipboard" },
  { id: "postPour", label: "Post-Pour", icon: "clipboard" },
  { id: "uploads", label: "Photos", icon: "upload" },
  { id: "deliveryTickets", label: "Tickets", icon: "clipboard" },
  { id: "ppe", label: "PPE", icon: "hardhat" },
  { id: "incidents", label: "Incidents", icon: "alert" },
  { id: "toolChecklist", label: "Tools", icon: "clipboard" },
  { id: "calculator", label: "Calc", icon: "calculator" },
  { id: "changeOrders", label: "Change", icon: "refresh" },
  { id: "support", label: "Help", icon: "help" },
];

const MOBILE_NAV_COMPACT_LABELS = {
  commandCenter: "Command",
  communications: "Comms",
  uploads: "Photos",
  deliveryTickets: "Tickets",
  jobDraftImports: "Imports",
  changeOrders: "Changes",
  toolbox: "Toolbox",
  toolChecklist: "Tools",
};

export function getFieldMobileNavItems(visibleNavItems) {
  const visibleById = new Map((visibleNavItems || []).map((item) => [item.id, item]));
  const orderedItems = FIELD_MOBILE_NAV_ORDER
    .map((item) => {
      const visible = visibleById.get(item.id);
      return visible ? { ...visible, label: item.label, icon: item.icon || visible.icon } : null;
    })
    .filter(Boolean);
  const orderedIds = new Set(orderedItems.map((item) => item.id));
  return [
    ...orderedItems,
    ...(visibleNavItems || []).filter((item) => !orderedIds.has(item.id)),
  ];
}

export function FieldMobileQuickNav({ items, active, onOpen }) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const safeItems = items || [];
  const activeItem = safeItems.find((item) => item.id === active);
  const visibleItems = activeItem
    ? [activeItem, ...safeItems.filter((item) => item.id !== active)]
    : safeItems;
  const primaryItems = visibleItems.slice(0, 5);
  const overflowItems = visibleItems.slice(5);

  useEffect(() => {
    setIsMoreOpen(false);
  }, [active, safeItems.length]);

  if (!safeItems.length) return null;

  function handleOpen(itemId) {
    setIsMoreOpen(false);
    onOpen(itemId);
    window.setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 0);
  }

  return (
    <nav className="co-mobile-bottom-nav mobile-nav-safe fixed bottom-0 left-0 right-0 z-40 border-t border-blue-100 bg-white/95 px-2 py-2 backdrop-blur lg:hidden" aria-label="Mobile navigation">
      {overflowItems.length ? (
        <div className="co-mobile-bottom-nav-more-panel" hidden={!isMoreOpen}>
          {overflowItems.map((item) => (
            <button key={item.id} type="button" onClick={() => handleOpen(item.id)}>
              <Icon name={item.icon || "grid"} className="h-4 w-4" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      ) : null}
      <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {primaryItems.map((item) => {
          const isActive = active === item.id;
          const mobileLabel = MOBILE_NAV_COMPACT_LABELS[item.id] || item.label;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleOpen(item.id)}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              className={`co-mobile-bottom-nav-button flex min-w-[74px] shrink-0 flex-col items-center justify-center rounded-2xl border px-3 py-2 text-[11px] font-black transition ${isActive ? "is-active border-blue-700 bg-blue-700 text-white shadow-panel" : "border-blue-100 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50"}`}
            >
              <Icon name={item.icon || "grid"} className="h-4 w-4" />
              <span className="mt-1 block max-w-[68px] truncate">{mobileLabel}</span>
            </button>
          );
        })}
        {overflowItems.length ? (
          <button
            type="button"
            onClick={() => setIsMoreOpen((current) => !current)}
            aria-expanded={isMoreOpen}
            className={`co-mobile-bottom-nav-button co-mobile-bottom-nav-more-toggle flex min-w-[74px] shrink-0 flex-col items-center justify-center rounded-2xl border px-3 py-2 text-[11px] font-black transition ${isMoreOpen ? "is-active border-blue-700 bg-blue-700 text-white shadow-panel" : "border-blue-100 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50"}`}
          >
            <Icon name="grid" className="h-4 w-4" />
            <span className="mt-1 block max-w-[68px] truncate">More</span>
          </button>
        ) : null}
      </div>
    </nav>
  );
}
