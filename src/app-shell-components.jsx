import { useEffect, useState } from "react";

import { getButtonToneClass, getCardClass, getStatusToneClass } from "./design-tokens";

function iconStrokeProps(className) {
  return {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.1",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
    "aria-hidden": "true",
  };
}

export function Icon({ name, className = "h-4 w-4" }) {
  const common = iconStrokeProps(className);
  const paths = {
    grid: [<path key="1" d="M4 4h7v7H4z" />, <path key="2" d="M13 4h7v7h-7z" />, <path key="3" d="M4 13h7v7H4z" />, <path key="4" d="M13 13h7v7h-7z" />],
    briefcase: [<path key="1" d="M10 6V5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v1" />, <path key="2" d="M3 8h18v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Z" />, <path key="3" d="M3 13h18" />],
    calendar: [<path key="1" d="M8 2v4" />, <path key="2" d="M16 2v4" />, <path key="3" d="M3 9h18" />, <path key="4" d="M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />],
    clock: [<circle key="1" cx="12" cy="12" r="9" />, <path key="2" d="M12 7v5l3 2" />],
    document: [<path key="1" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />, <path key="2" d="M14 2v6h6" />, <path key="3" d="M8 13h8M8 17h6" />],
    upload: [<path key="1" d="M12 16V4" />, <path key="2" d="m7 9 5-5 5 5" />, <path key="3" d="M20 16v4H4v-4" />],
    download: [<path key="1" d="M12 4v12" />, <path key="2" d="m7 11 5 5 5-5" />, <path key="3" d="M20 20H4" />],
    inbox: [<path key="1" d="M4 4h16l2 10v6H2v-6Z" />, <path key="2" d="M2 14h6l2 3h4l2-3h6" />],
    users: [<path key="1" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />, <circle key="2" cx="9" cy="7" r="4" />, <path key="3" d="M22 21v-2a4 4 0 0 0-3-3.87" />],
    quote: [<path key="1" d="M6 3h12a2 2 0 0 1 2 2v16l-4-3H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />, <path key="2" d="M8 8h8M8 12h6" />],
    refresh: [<path key="1" d="M21 12a9 9 0 0 1-15.5 6.3L3 16" />, <path key="2" d="M3 12A9 9 0 0 1 18.5 5.7L21 8" />, <path key="3" d="M3 16h5v-5M21 8h-5v5" />],
    alert: [<path key="1" d="m12 2 10 18H2Z" />, <path key="2" d="M12 8v5" />, <path key="3" d="M12 17h.01" />],
    clipboard: [<path key="1" d="M9 3h6l1 2h3v17H5V5h3Z" />, <path key="2" d="M9 3h6v4H9z" />, <path key="3" d="M8 12h8M8 16h6" />],
    hardhat: [<path key="1" d="M3 18h18" />, <path key="2" d="M5 18a7 7 0 0 1 14 0" />, <path key="3" d="M9 10V6h6v4" />],
    calculator: [<path key="1" d="M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" />, <path key="2" d="M8 6h8v4H8z" />, <path key="3" d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" />],
    spark: [<path key="1" d="M12 2l1.5 6.5L20 10l-6.5 1.5L12 18l-1.5-6.5L4 10l6.5-1.5Z" />],
    layers: [<path key="1" d="m12 2 9 5-9 5-9-5Z" />, <path key="2" d="m3 12 9 5 9-5" />, <path key="3" d="m3 17 9 5 9-5" />],
    settings: [<circle key="1" cx="12" cy="12" r="3" />, <path key="2" d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1A2 2 0 1 1 4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1A2 2 0 1 1 7.1 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3.1V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 1 1 19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1a2 2 0 1 1 0 4H21a1.7 1.7 0 0 0-1.6 1Z" />],
    plus: [<path key="1" d="M12 5v14" />, <path key="2" d="M5 12h14" />],
    check: [<path key="1" d="m5 13 4 4L19 7" />],
    arrowUpRight: [<path key="1" d="M7 17 17 7" />, <path key="2" d="M9 7h8v8" />],
    database: [<ellipse key="1" cx="12" cy="5" rx="7" ry="3" />, <path key="2" d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5" />, <path key="3" d="M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />],
    lock: [<rect key="1" x="4" y="11" width="16" height="10" rx="2" />, <path key="2" d="M8 11V7a4 4 0 1 1 8 0v4" />],
    bell: [<path key="1" d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />, <path key="2" d="M10 21a2 2 0 0 0 4 0" />],
    phone: [<path key="1" d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7A2 2 0 0 1 22 16.9Z" />],
    help: [<circle key="1" cx="12" cy="12" r="9" />, <path key="2" d="M9.5 9a2.7 2.7 0 0 1 5 1.4c0 1.8-2.5 2.1-2.5 4" />, <path key="3" d="M12 18h.01" />],
  };

  return <svg {...common}>{paths[name] || paths.grid}</svg>;
}

export function Button({ children, variant = "primary", size = "md", className = "", ...props }) {
  const sizes = {
    sm: "min-h-8 px-3 py-1.5 text-xs",
    md: "min-h-9 px-3.5 py-2 text-sm",
    lg: "min-h-10 px-4 py-2.5 text-sm",
  };

  return (
    <button className={`co-focus-ring inline-flex min-w-0 max-w-full items-center justify-center gap-2 rounded-xl text-center font-black leading-tight transition whitespace-normal break-words disabled:cursor-not-allowed disabled:opacity-60 ${getButtonToneClass(variant)} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Badge({ children, tone = "blue" }) {
  return <span className={`inline-flex min-w-0 max-w-full items-center rounded-lg px-2.5 py-0.5 text-[11px] font-black leading-5 tracking-[0.02em] ring-1 break-words ${getStatusToneClass(tone)}`}>{children}</span>;
}

export function StatusBadge({ status }) {
  const normalized = status.toLowerCase();
  let tone = "slate";
  if (["approved", "ready", "done", "complete"].includes(normalized)) tone = "green";
  if (["new", "in progress", "in_progress", "estimate sent"].includes(normalized)) tone = "blue";
  if (["blocked"].includes(normalized)) tone = "red";
  if (["due today", "site visit", "waiting", "planned", "field complete", "field_complete"].includes(normalized)) tone = "amber";
  if (["scheduled", "ready to bill", "billing_ready"].includes(normalized)) tone = "violet";
  return <Badge tone={tone}>{status}</Badge>;
}

export function Card({ children, className = "", variant = "default", ...props }) {
  return <div className={`${getCardClass(variant)} ${className}`} {...props}>{children}</div>;
}

export function PageHeader({ eyebrow, title, description, actions, tabs }) {
  return (
    <div className="co-page-header mb-4 border-b border-slate-200/90 bg-white/95 px-5 py-4 shadow-[0_18px_48px_-44px_rgba(7,17,31,0.62)] backdrop-blur sm:px-6">
      <div className="mx-auto w-full max-w-[1520px]">
        <div className="flex min-w-0 max-w-full flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-orange-700">{eyebrow}</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-[1.85rem]">{title}</h1>
            {description ? <p className="mt-1.5 max-w-4xl text-sm font-bold leading-5 text-slate-600">{description}</p> : null}
          </div>
          {actions ? <div className="co-page-header-actions flex min-w-0 max-w-full flex-wrap gap-2 lg:justify-end">{actions}</div> : null}
        </div>
        {tabs ? <div className="co-page-header-tabs mt-4 flex min-w-0 max-w-full gap-2 overflow-x-auto pb-1">{tabs}</div> : null}
      </div>
    </div>
  );
}

export function SectionHeader({ title, description, action }) {
  return (
    <div className="mb-3 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div className="co-section-accent min-w-0">
        <h2 className="break-words text-base font-black text-slate-950">{title}</h2>
        {description ? <p className="mt-1 break-words text-sm font-bold leading-5 text-slate-600">{description}</p> : null}
      </div>
      {action ? <div className="min-w-0 max-w-full w-full sm:w-auto sm:shrink-0">{action}</div> : null}
    </div>
  );
}

export function StatCard({ title, value, detail }) {
  return (
    <div className="min-w-0 max-w-full rounded-xl border border-slate-200 bg-white/95 p-3 shadow-[0_14px_34px_-30px_rgba(7,17,31,0.5)]">
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">{title}</p>
      <p className="mt-2 break-words text-xl font-black text-slate-950">{value}</p>
      {detail ? <p className="mt-1 break-words text-sm font-bold text-slate-600">{detail}</p> : null}
    </div>
  );
}

export function ProposalTotalCard({ value, detail, label = "Proposal total" }) {
  return (
    <div className="min-w-0 max-w-full rounded-xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 p-5 text-white shadow-sm shadow-slate-900/20">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-100">{label}</p>
      <p className="mt-2 break-words text-3xl font-black tracking-tight sm:text-4xl">{value}</p>
      {detail ? <p className="mt-2 break-words text-sm font-bold leading-6 text-orange-100">{detail}</p> : null}
    </div>
  );
}

export function FilterBar({ filters, active, setActive, search, setSearch, placeholder = "Search..." }) {
  return (
    <div className="co-filter-bar flex min-w-0 max-w-full flex-col gap-3 overflow-hidden border-b border-slate-200 bg-slate-50/80 p-3 md:flex-row md:items-center md:justify-between">
      <div className="scrollbar-none -mx-1 flex min-w-0 max-w-full gap-2 overflow-x-auto overflow-y-hidden px-1 pb-1">
        {filters.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setActive(filter)}
            className={`shrink-0 rounded-lg px-3 py-2 text-xs font-black ${active === filter ? "bg-blue-700 text-white shadow-sm shadow-blue-700/20" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-orange-50 hover:text-orange-700 hover:ring-orange-200"}`}
          >
            {filter}
          </button>
        ))}
      </div>
      <div className="min-w-0 w-full md:w-72">
        <input className="field-input w-full" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={placeholder} />
      </div>
    </div>
  );
}

export function SelectField({ label, children, ...props }) {
  return (
    <label className="field-label">
      <span>{label}</span>
      <select className="field-input" {...props}>
        {children}
      </select>
    </label>
  );
}

export function InputField({ label, ...props }) {
  return (
    <label className="field-label">
      <span>{label}</span>
      <input className="field-input" {...props} />
    </label>
  );
}

export function TextAreaField({ label, ...props }) {
  return (
    <label className="field-label">
      <span>{label}</span>
      <textarea className="field-input min-h-28 resize-y" {...props} />
    </label>
  );
}

export function StateCard({ title, description, tone = "blue" }) {
  const tones = {
    blue: "border-blue-200 bg-white text-slate-600",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    green: "border-emerald-200 bg-emerald-50 text-emerald-800",
    red: "border-red-200 bg-red-50 text-red-700",
    slate: "border-slate-200 bg-white text-slate-600",
  };

  return (
    <div className={`co-state-card min-w-0 max-w-full rounded-xl border p-4 text-center shadow-[0_14px_34px_-30px_rgba(7,17,31,0.5)] sm:p-5 ${tones[tone] || tones.blue}`}>
      <p className="font-black text-slate-950">{title}</p>
      <p className="mt-2 break-words text-sm font-bold">{description}</p>
    </div>
  );
}

export function WorkQueueCard({
  eyebrow,
  title,
  meta,
  status,
  tone = "orange",
  actionLabel,
  onClick,
  selected = false,
  children,
}) {
  const toneClass = {
    green: "co-work-queue-card--green",
    red: "co-work-queue-card--red",
    blue: "co-work-queue-card--blue",
    slate: "co-work-queue-card--slate",
    amber: "co-work-queue-card--amber",
    orange: "co-work-queue-card--orange",
  }[tone] || "co-work-queue-card--orange";
  const Component = onClick ? "button" : "div";

  return (
    <Component type={onClick ? "button" : undefined} className={`co-work-queue-card ${toneClass}${selected ? " is-selected" : ""}`} onClick={onClick}>
      <div className="co-work-queue-card-head">
        <div className="min-w-0">
          {eyebrow ? <p className="co-work-queue-eyebrow">{eyebrow}</p> : null}
          <h3>{title}</h3>
          {meta ? <p className="co-work-queue-meta">{meta}</p> : null}
        </div>
        {status ? <span className="co-work-queue-status">{status}</span> : null}
      </div>
      {children ? <div className="co-work-queue-body">{children}</div> : null}
      {actionLabel ? <span className="co-work-queue-action">{actionLabel}</span> : null}
    </Component>
  );
}

export function AssistantRail({ title = "Apex Assistant", eyebrow = "Assistant", description, priorities = [], actions = [], className = "" }) {
  return (
    <section className={`co-assistant-rail ${className}`}>
      <div className="co-assistant-rail-head">
        <span>{eyebrow}</span>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {priorities.length > 0 ? (
        <div className="co-assistant-rail-priorities">
          {priorities.map((item) => (
            <div key={item.label} className={`co-assistant-rail-priority co-assistant-rail-priority--${item.tone || "orange"}`}>
              <span>{item.value}</span>
              <p>{item.label}</p>
            </div>
          ))}
        </div>
      ) : null}
      {actions.length > 0 ? (
        <div className="co-assistant-rail-actions">
          {actions.map((action) => (
            <button key={action.label} type="button" onClick={action.onClick} disabled={action.disabled}>
              {action.icon ? <Icon name={action.icon} /> : null}
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function CommandPageFrame({ children, kpis, rail, footer, className = "" }) {
  const hasRail = Boolean(rail);

  return (
    <div className={`co-command-page-frame ${hasRail ? "co-command-page-frame--has-rail" : "co-command-page-frame--no-rail"} ${className}`}>
      {kpis ? <div className="co-command-page-frame-kpis">{kpis}</div> : null}
      <div className="co-command-page-frame-grid">
        <div className="co-command-page-frame-main">{children}</div>
        {rail ? <aside className="co-command-page-frame-rail">{rail}</aside> : null}
      </div>
      {footer ? <div className="co-command-page-frame-footer">{footer}</div> : null}
    </div>
  );
}

export function DesktopCommandWorkspaceFrame({ children, className = "" }) {
  return (
    <div className={`co-desktop-command-workspace-frame ${className}`}>
      {children}
    </div>
  );
}

export function ApexCommandKpiStrip({ items = [] }) {
  const visibleItems = Array.isArray(items) ? items.slice(0, 4) : [];

  return (
    <div className="co-apex-command-kpi-strip" aria-label="Today metrics">
      {visibleItems.map((item) => {
        const Component = item.onClick ? "button" : "div";
        return (
          <Component
            key={item.id || item.label}
            type={item.onClick ? "button" : undefined}
            className="co-apex-command-kpi"
            data-tone={item.tone || "slate"}
            onClick={item.onClick}
          >
            <span className="co-apex-command-kpi-icon">{item.icon ? <Icon name={item.icon} /> : null}</span>
            <span className="co-apex-command-kpi-copy">
              <strong>{item.value}</strong>
              <span>{item.label}</span>
              {item.helper ? <em>{item.helper}</em> : null}
            </span>
          </Component>
        );
      })}
    </div>
  );
}

export function ApexPrimaryQueuePanel({ title = "Priority queue", description = "", items = [], selectedId = "", onSelect, emptyState, controls = null, limit = 7, badgeLabel = "" }) {
  const safeItems = Array.isArray(items) ? items : [];
  const safeLimit = Number.isFinite(Number(limit)) && Number(limit) > 0 ? Number(limit) : 7;
  const visibleItems = safeItems.slice(0, safeLimit);

  return (
    <Card className="co-apex-primary-queue-panel">
      <div className="co-apex-panel-head">
        <span>
          <strong>{title}</strong>
          {description ? <em>{description}</em> : null}
        </span>
        <Badge tone={visibleItems.length ? "orange" : "green"}>{badgeLabel || `${visibleItems.length}/${safeItems.length || safeLimit}`}</Badge>
      </div>
      {controls ? <div className="co-apex-primary-queue-controls">{controls}</div> : null}
      <div className="co-apex-primary-queue-list">
        {visibleItems.length ? visibleItems.map((item) => (
          <WorkQueueCard
            key={item.id}
            eyebrow={item.eyebrow || item.sourceLabel}
            title={item.title}
            meta={item.meta || item.description}
            status={item.status || item.statusLabel}
            tone={item.tone || "orange"}
            actionLabel={item.actionLabel || "Review"}
            selected={selectedId === item.id}
            onClick={() => onSelect?.(item)}
          >
            {Array.isArray(item.badges) && item.badges.length ? (
              <div className="co-apex-queue-badges">
                {item.badges.slice(0, 3).map((badge) => <Badge key={badge.label || badge} tone={badge.tone || "slate"}>{badge.label || badge}</Badge>)}
              </div>
            ) : null}
          </WorkQueueCard>
        )) : (
          emptyState || <StateCard title="Queue clear" description="Priority work appears here when it needs owner or office review." tone="green" />
        )}
      </div>
    </Card>
  );
}

export function ApexSelectedDetailPanel({ title = "Selected detail", item, children, emptyState }) {
  return (
    <Card className="co-apex-selected-detail-panel">
      <div className="co-apex-panel-head">
        <span>
          <strong>{title}</strong>
          <em>{item ? "Review context and choose the next action." : "Choose a queue item to inspect it."}</em>
        </span>
        {item?.statusLabel || item?.status ? <StatusBadge status={item.statusLabel || item.status} /> : null}
      </div>
      {item ? (
        <div className="co-apex-selected-detail-body">
          {children}
        </div>
      ) : (
        emptyState || <StateCard title="Nothing selected" description="Select a priority item to see job, proof, estimate, or blocker context." tone="slate" />
      )}
    </Card>
  );
}

export function ApexAssistantActionPanel({ title = "Today Assistant", description = "", priorities = [], actions = [], guardrails = [] }) {
  const safeActions = Array.isArray(actions) ? actions.slice(0, 3) : [];
  const safePriorities = Array.isArray(priorities) ? priorities.slice(0, 4) : [];
  const safeGuardrails = Array.isArray(guardrails) ? guardrails.slice(0, 3) : [];

  return (
    <div className="co-apex-assistant-action-panel">
      <AssistantRail
        eyebrow="Apex Assistant"
        title={title}
        description={description}
        priorities={safePriorities}
        actions={safeActions}
      />
      {safeGuardrails.length ? (
        <Card className="co-apex-assistant-guardrails">
          <strong>Protected basics</strong>
          <ul>
            {safeGuardrails.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}

export function ApexQuickActionBar({ actions = [] }) {
  const visibleActions = Array.isArray(actions) ? actions.slice(0, 3) : [];
  if (!visibleActions.length) return null;

  return (
    <div className="co-apex-quick-action-bar" aria-label="Today quick actions">
      {visibleActions.map((action, index) => (
        <Button key={action.id || action.label} type="button" size="sm" variant={index === 0 ? "primary" : "secondary"} onClick={action.onClick} disabled={action.disabled}>
          {action.icon ? <Icon name={action.icon} /> : null}
          {action.label}
        </Button>
      ))}
    </div>
  );
}

export function ApexWorkspaceToolLauncher({
  title = "Workspace tools",
  description = "",
  tools = [],
  selectedToolId = "",
  onSelectTool,
}) {
  const visibleTools = Array.isArray(tools) ? tools.filter(Boolean) : [];

  return (
    <Card className="co-apex-workspace-tool-launcher">
      <div className="co-apex-panel-head">
        <span>
          <strong>{title}</strong>
          {description ? <em>{description}</em> : null}
        </span>
        <Badge tone="slate">{visibleTools.length} tools</Badge>
      </div>
      <div className="co-apex-workspace-tool-grid">
        {visibleTools.length ? visibleTools.map((tool) => {
          const isSelected = selectedToolId === tool.id;
          return (
            <button
              key={tool.id || tool.label}
              type="button"
              className={`co-apex-workspace-tool-card ${isSelected ? "is-selected" : ""}`}
              data-tone={tool.tone || "slate"}
              onClick={() => onSelectTool?.(tool)}
              disabled={tool.disabled}
              aria-pressed={isSelected || undefined}
            >
              <span className="co-apex-workspace-tool-icon">
                <Icon name={tool.icon || "grid"} />
              </span>
              <span className="co-apex-workspace-tool-copy">
                <strong>{tool.label}</strong>
                {tool.helper ? <em>{tool.helper}</em> : null}
              </span>
              {tool.count || tool.count === 0 ? <b>{tool.count}</b> : null}
            </button>
          );
        }) : (
          <StateCard title="No tools available" description="Workspace tools appear here when they are enabled for this role." tone="slate" />
        )}
      </div>
    </Card>
  );
}

export function ApexWorkspaceLeaderShell({
  eyebrow = "Apex HQ",
  title,
  description,
  kpis = [],
  tools = [],
  selectedToolId = "",
  onSelectTool,
  toolTitle = "Workspace tools",
  toolDescription = "",
  queue,
  detail,
  quickActions = [],
  children,
  className = "",
}) {
  const selectedItem = detail?.item || null;

  return (
    <section className={`co-apex-workspace-leader-shell ${className}`}>
      <div className="co-apex-office-command-head co-apex-workspace-leader-head">
        <div className="min-w-0">
          <p>{eyebrow}</p>
          <h1>{title}</h1>
          {description ? <span>{description}</span> : null}
        </div>
        <ApexQuickActionBar actions={quickActions} />
      </div>
      <CommandPageFrame
        className="co-apex-workspace-leader-frame"
        kpis={<ApexCommandKpiStrip items={kpis} />}
      >
        <DesktopCommandWorkspaceFrame className="co-apex-workspace-leader-workspace">
          <div className="co-apex-workspace-leader-stack">
            <ApexWorkspaceToolLauncher
              title={toolTitle}
              description={toolDescription}
              tools={tools}
              selectedToolId={selectedToolId}
              onSelectTool={onSelectTool}
            />
            <ApexPrimaryQueuePanel {...queue} />
          </div>
          <ApexSelectedDetailPanel title={detail?.title} item={selectedItem} emptyState={detail?.emptyState}>
            {children || detail?.render?.(selectedItem)}
          </ApexSelectedDetailPanel>
        </DesktopCommandWorkspaceFrame>
      </CommandPageFrame>
    </section>
  );
}

function mobileHrefPhone(value = "") {
  return String(value || "").replace(/[^\d+]/g, "");
}

function mobileDraftHref(kind, { phone = "", email = "", subject = "", body = "" } = {}) {
  if (kind === "call") return phone ? `tel:${mobileHrefPhone(phone)}` : "";
  if (kind === "text") return phone ? `sms:${mobileHrefPhone(phone)}?&body=${encodeURIComponent(body || "")}` : "";
  if (kind === "email") return email ? `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject || "")}&body=${encodeURIComponent(body || "")}` : "";
  return "";
}

export function ApexMobileRoleShell({ eyebrow = "Apex HQ", title, description, children, className = "" }) {
  return (
    <section className={`co-apex-mobile-role-shell ${className}`}>
      <header className="co-apex-mobile-role-head">
        <p>{eyebrow}</p>
        <h1>{title}</h1>
        {description ? <span>{description}</span> : null}
      </header>
      {children}
    </section>
  );
}

export function ApexMobileBottomNav({ items = [], active, onOpen }) {
  const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];
  const primaryItems = safeItems.slice(0, 4);
  const overflowItems = safeItems.slice(4);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const activeInOverflow = overflowItems.some((item) => item.id === active);

  useEffect(() => {
    setIsMoreOpen(false);
  }, [active, safeItems.length]);

  if (!safeItems.length) return null;

  function handleOpen(itemId) {
    setIsMoreOpen(false);
    onOpen?.(itemId);
    window.setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 0);
  }

  return (
    <nav className="co-mobile-bottom-nav co-apex-mobile-bottom-nav mobile-nav-safe fixed bottom-0 left-0 right-0 z-40 lg:hidden" aria-label="Owner mobile navigation">
      {overflowItems.length ? (
        <div className="co-mobile-bottom-nav-more-panel co-apex-mobile-bottom-nav-more-panel" hidden={!isMoreOpen}>
          {overflowItems.map((item) => (
            <button key={item.id} type="button" onClick={() => handleOpen(item.id)}>
              <Icon name={item.icon || "grid"} className="h-4 w-4" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      ) : null}
      <div className="co-apex-mobile-bottom-nav-row">
        {primaryItems.map((item) => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleOpen(item.id)}
              aria-label={item.ariaLabel || item.label}
              aria-current={isActive ? "page" : undefined}
              className={`co-mobile-bottom-nav-button co-apex-mobile-bottom-nav-button ${isActive ? "is-active" : ""}`}
            >
              <Icon name={item.icon || "grid"} className="h-4 w-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
        {overflowItems.length ? (
          <button
            type="button"
            onClick={() => setIsMoreOpen((current) => !current)}
            aria-expanded={isMoreOpen}
            className={`co-mobile-bottom-nav-button co-apex-mobile-bottom-nav-button co-apex-mobile-bottom-nav-more-toggle ${isMoreOpen || activeInOverflow ? "is-active" : ""}`}
          >
            <Icon name="grid" className="h-4 w-4" />
            <span>More</span>
          </button>
        ) : null}
      </div>
    </nav>
  );
}

export function ApexMobileKpiGrid({ items = [] }) {
  const visibleItems = Array.isArray(items) ? items.slice(0, 4) : [];
  return (
    <div className="co-apex-mobile-kpi-grid" aria-label="Mobile command metrics">
      {visibleItems.map((item) => {
        const Component = item.onClick ? "button" : "div";
        return (
          <Component key={item.id || item.label} type={item.onClick ? "button" : undefined} onClick={item.onClick} className="co-apex-mobile-kpi-card" data-tone={item.tone || "slate"}>
            <span>{item.icon ? <Icon name={item.icon} /> : null}</span>
            <strong>{item.value}</strong>
            <em>{item.label}</em>
            {item.helper ? <small>{item.helper}</small> : null}
          </Component>
        );
      })}
    </div>
  );
}

export function ApexMobileActionQueue({ title = "Action queue", items = [], selectedId = "", onSelect }) {
  const visibleItems = Array.isArray(items) ? items.slice(0, 5) : [];
  return (
    <section className="co-apex-mobile-action-queue">
      <div className="co-apex-mobile-section-head">
        <span>{title}</span>
        <Badge tone={visibleItems.length ? "orange" : "green"}>{visibleItems.length}/5</Badge>
      </div>
      <div className="co-apex-mobile-action-list">
        {visibleItems.length ? visibleItems.map((item) => (
          <button key={item.id} type="button" className={`co-apex-mobile-action-row ${selectedId === item.id ? "is-selected" : ""}`} data-tone={item.tone || "slate"} onClick={() => onSelect?.(item)}>
            <span className="co-apex-mobile-action-dot" aria-hidden="true" />
            <span className="min-w-0">
              <strong>{item.title}</strong>
              <small>{item.meta || item.description || "Review context"}</small>
            </span>
            <em>{item.actionLabel || "Review"}</em>
          </button>
        )) : (
          <StateCard title="Queue clear" description="Priority mobile command work appears here when it needs owner review." tone="green" />
        )}
      </div>
    </section>
  );
}

export function ApexMobileContactActionBar({ phone = "", email = "", subject = "", textDraft = "", emailBody = "", onOpenContact }) {
  const callHref = mobileDraftHref("call", { phone });
  const textHref = mobileDraftHref("text", { phone, body: textDraft });
  const emailHref = mobileDraftHref("email", { email, subject, body: emailBody });
  const actions = [
    { id: "call", label: "Call", icon: "phone", href: callHref, disabled: !callHref },
    { id: "text", label: "Text Draft", icon: "quote", href: textHref, disabled: !textHref },
    { id: "email", label: "Email Draft", icon: "document", href: emailHref, disabled: !emailHref },
  ];

  return (
    <div className="co-apex-mobile-contact-actions" aria-label="Manual contact actions">
      {actions.map((action) => action.disabled ? (
        <button key={action.id} type="button" data-contact-action={action.id} disabled>
          <Icon name={action.icon} />
          <span>{action.label}</span>
        </button>
      ) : (
        <a key={action.id} href={action.href} data-contact-action={action.id} aria-label={`${action.label} manual draft`}>
          <Icon name={action.icon} />
          <span>{action.label}</span>
        </a>
      ))}
      <button type="button" onClick={onOpenContact} data-contact-action="open-contact" disabled={!onOpenContact}>
        <Icon name="users" />
        <span>Open Contact</span>
      </button>
    </div>
  );
}

export function ApexOfficeCommandShell({
  eyebrow = "Apex HQ",
  title,
  description,
  kpis = [],
  queue,
  detail,
  quickActions = [],
  overview = null,
  children,
  className = "",
}) {
  const selectedItem = detail?.item || null;

  return (
    <section className={`co-apex-office-command-shell co-desktop-office-command-standard ${className}`.trim()} data-desktop-standard="office-command">
      <div className="co-apex-office-command-head">
        <div className="min-w-0">
          <p>{eyebrow}</p>
          <h1>{title}</h1>
          {description ? <span>{description}</span> : null}
        </div>
        <ApexQuickActionBar actions={quickActions} />
      </div>
      <CommandPageFrame
        className="co-apex-office-command-frame"
        kpis={<ApexCommandKpiStrip items={kpis} />}
      >
        {overview ? <div className="co-apex-office-command-overview">{overview}</div> : null}
        <DesktopCommandWorkspaceFrame className="co-apex-office-command-workspace">
          <ApexPrimaryQueuePanel {...queue} />
          <ApexSelectedDetailPanel title={detail?.title} item={selectedItem} emptyState={detail?.emptyState}>
            {children || detail?.render?.(selectedItem)}
          </ApexSelectedDetailPanel>
        </DesktopCommandWorkspaceFrame>
      </CommandPageFrame>
    </section>
  );
}

export function DesktopCommandDrawer({
  children,
  className = "",
  bodyClassName = "",
  description = "",
  drawerRef,
  id,
  onToggle,
  open,
  summaryLabel = "Open",
  title,
  variant = "right",
}) {
  const closeDrawer = (event) => {
    const drawer = event.currentTarget.closest("details");
    if (drawer) {
      drawer.open = false;
      drawer.dispatchEvent(new Event("toggle", { bubbles: true }));
    }
  };

  const openProps = typeof open === "boolean" ? { open } : {};

  return (
    <details
      id={id}
      ref={drawerRef}
      className={`co-desktop-command-drawer co-desktop-command-drawer--${variant} ${className}`}
      onToggle={onToggle}
      {...openProps}
    >
      <summary>
        <span>
          <strong>{title}</strong>
          {description ? <em>{description}</em> : null}
        </span>
        <span>{summaryLabel}</span>
      </summary>
      <div className="co-desktop-command-drawer-panel">
        <div className="co-desktop-command-drawer-head">
          <span>
            <strong>{title}</strong>
            {description ? <em>{description}</em> : null}
          </span>
          <button type="button" onClick={closeDrawer}>Close</button>
        </div>
        <div className={`co-desktop-command-drawer-body ${bodyClassName}`}>
          {children}
        </div>
      </div>
    </details>
  );
}

export function EstimateStudioShell({
  options = [],
  selectedOptionId = "",
  onSelectOption,
  children,
  sidebar,
  packetTiles = [],
  assistantActions = [],
}) {
  return (
    <CommandPageFrame
      className="co-estimate-studio-shell"
      rail={sidebar}
      footer={
        <AssistantRail
          eyebrow="Apex Assistant"
          title="Estimate"
          description="Review the packet, missing scope, and foreman handoff without covering the proposal workspace."
          actions={assistantActions}
        />
      }
    >
      <aside className="co-estimate-studio-option-rail" aria-label="Estimate options">
        <div className="co-estimate-studio-option-head">
          <p>Estimate Options</p>
          <span>{options.length} active</span>
        </div>
        <div className="co-estimate-studio-option-list">
          {options.length > 0 ? options.map((option, index) => (
            <WorkQueueCard
              key={option.id}
              eyebrow={`Option ${index + 1}`}
              title={option.title}
              meta={option.meta}
              status={option.status}
              tone={option.tone}
              actionLabel={option.actionLabel}
              selected={selectedOptionId === option.id}
              onClick={() => onSelectOption?.(option.id)}
            />
          )) : (
            <div className="co-estimate-studio-empty-option">Create or select a draft to start the packet.</div>
          )}
        </div>
      </aside>
      <div className="co-estimate-studio-workbench">
        {children}
        {packetTiles.length > 0 ? (
          <section className="co-estimate-studio-packet-preview" aria-label="GC packet preview">
            <div className="co-estimate-studio-packet-head">
              <p>GC Packet Preview</p>
              <span>Customer-safe packet sections</span>
            </div>
            <div className="co-estimate-studio-packet-tiles">
              {packetTiles.map((tile) => (
                <button key={tile.label} type="button" onClick={tile.onClick} disabled={tile.disabled}>
                  <Icon name={tile.icon || "document"} />
                  <span>{tile.label}</span>
                </button>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </CommandPageFrame>
  );
}
