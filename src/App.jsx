import { useEffect, useMemo, useRef, useState } from "react";

import {
  archiveCustomer,
  archiveJob,
  archiveLead,
  archiveQueueItem,
  bootstrapAdminAccount,
  convertLead,
  convertLeadToCustomer,
  createCustomer,
  createJob,
  createLead,
  createQueueItem,
  deleteJob,
  deleteLead,
  deleteQueueItem,
  getBootstrap,
  getHealth,
  getSetupStatus,
  login,
  logout,
  resetWorkspace,
  restoreCustomer,
  restoreJob,
  restoreLead,
  restoreQueueItem,
  toggleQueueItem,
  updateCustomer,
  updateJob,
  updateLead,
} from "./api";
import { buildCustomerPath, buildJobPath, buildLeadPath, getModulePath, normalizePathname, parseAppPath } from "./app-routing";
import { getCustomerFilterLayoutClasses } from "./customer-filter-layout";
import { deriveCustomerListState, filterCustomers, relatedCustomerRecords } from "./customer-utils";
import { deriveLeadListState, relatedLeadActivity } from "./lead-utils";

const APP_NAME = "Concrete Ops";
const COMPANY_NAME = "Last Yard Concrete";
const SESSION_TOKEN_KEY = "concrete-ops/session-token";
const AUTOSAVE_DELAY_MS = 700;

const TOKENS = {
  colors: [
    ["Navy", "#0F172A", "Primary text, dark headers, footer surfaces"],
    ["Blue", "#1D4ED8", "Primary actions, active nav, selected states"],
    ["Soft Blue", "#EFF6FF", "Section backgrounds and low emphasis panels"],
    ["Border", "#DBEAFE", "Dividers, table borders, input borders"],
    ["Page", "#F8FBFF", "Application background"],
    ["Muted", "#64748B", "Secondary text and metadata"],
  ],
  density: [
    ["Sidebar item", "40px", "Compact enough for long module lists"],
    ["Table row", "56px", "Readable field data without wasting vertical space"],
    ["Card padding", "16-20px", "Dense, operational, not landing-page spacing"],
    ["Header height", "64px", "Persistent utility bar with stable page context"],
  ],
};

const NAV_GROUPS = [
  {
    label: "Field",
    items: [
      { id: "dashboard", label: "Dashboard", icon: "grid" },
      { id: "jobs", label: "Jobs", icon: "briefcase" },
      { id: "time", label: "Time", icon: "clock" },
      { id: "reports", label: "Reports", icon: "document" },
      { id: "uploads", label: "Uploads", icon: "upload" },
    ],
  },
  {
    label: "Office",
    items: [
      { id: "leads", label: "Leads", icon: "inbox" },
      { id: "customers", label: "Customers", icon: "users" },
      { id: "estimates", label: "Estimates", icon: "quote" },
      { id: "changeOrders", label: "Change Orders", icon: "refresh" },
    ],
  },
  {
    label: "Safety",
    items: [
      { id: "incidents", label: "Incidents", icon: "alert" },
      { id: "toolbox", label: "Toolbox Talks", icon: "clipboard" },
      { id: "ppe", label: "PPE", icon: "hardhat" },
    ],
  },
  {
    label: "System",
    items: [
      { id: "calculator", label: "Calculator", icon: "calculator" },
      { id: "copilot", label: "Ops Copilot", icon: "spark" },
      { id: "design", label: "Design System", icon: "layers" },
      { id: "settings", label: "Settings", icon: "settings" },
    ],
  },
];

const EMPTY_APP_STATE = {
  user: null,
  users: [],
  customers: [],
  leads: [],
  leadStatusHistory: [],
  jobs: [],
  queueItems: [],
  activity: [],
  auditEvents: [],
  permissions: {
    customers: {
      canView: false,
      canManage: false,
    },
    leads: {
      canView: false,
      canManage: false,
    },
  },
  stats: {
    newLeads: 0,
    highPriorityLeads: 0,
    pipelineValue: 0,
    activeJobs: 0,
    scheduledJobs: 0,
    reportsDue: 0,
    queueBlocked: 0,
  },
};

const INITIAL_LEAD_FORM = {
  customer: "",
  customerId: "",
  city: "",
  project: "",
  status: "New",
  priority: "Normal",
  owner: "",
  ownerId: "",
  source: "Call-in",
  followUpDueAt: "",
  value: "",
  nextStep: "",
  notes: "",
};

const INITIAL_JOB_FORM = {
  customer: "",
  job: "",
  crew: "",
  stage: "Scheduled",
  due: "",
  progress: 15,
  next: "",
  notes: "",
};

const INITIAL_TASK_FORM = {
  title: "",
  meta: "",
  status: "Due today",
};

const INITIAL_CUSTOMER_FORM = {
  name: "",
  company: "",
  phone: "",
  email: "",
  city: "",
  serviceArea: "",
  status: "Prospect",
  notes: "",
};

const INITIAL_SETUP_FORM = {
  name: "",
  email: "",
  password: "",
  role: "Administrator",
};

const INITIAL_SETUP_STATUS = {
  checked: false,
  needsSetup: false,
  hasUsers: false,
  demoMode: false,
  demoUserExists: false,
  environmentBootstrap: false,
};

function runDesignSystemChecks() {
  const failures = [];
  const navIds = new Set(NAV_GROUPS.flatMap((group) => group.items.map((item) => item.id)));

  ["dashboard", "leads", "jobs", "reports", "calculator", "copilot", "design"].forEach((id) => {
    if (!navIds.has(id)) failures.push(`Missing nav item: ${id}`);
  });

  if (TOKENS.colors.length < 6) failures.push("Design tokens need enough color primitives.");

  if (failures.length > 0) {
    throw new Error(`Design system checks failed:\n- ${failures.join("\n- ")}`);
  }
}

runDesignSystemChecks();

function currency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatDateTime(value) {
  if (!value) return "Not recorded";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not recorded";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

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

function Icon({ name, className = "h-4 w-4" }) {
  const common = iconStrokeProps(className);
  const paths = {
    grid: [<path key="1" d="M4 4h7v7H4z" />, <path key="2" d="M13 4h7v7h-7z" />, <path key="3" d="M4 13h7v7H4z" />, <path key="4" d="M13 13h7v7h-7z" />],
    briefcase: [<path key="1" d="M10 6V5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v1" />, <path key="2" d="M3 8h18v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Z" />, <path key="3" d="M3 13h18" />],
    clock: [<circle key="1" cx="12" cy="12" r="9" />, <path key="2" d="M12 7v5l3 2" />],
    document: [<path key="1" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />, <path key="2" d="M14 2v6h6" />, <path key="3" d="M8 13h8M8 17h6" />],
    upload: [<path key="1" d="M12 16V4" />, <path key="2" d="m7 9 5-5 5 5" />, <path key="3" d="M20 16v4H4v-4" />],
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
  };

  return <svg {...common}>{paths[name] || paths.grid}</svg>;
}

function Button({ children, variant = "primary", size = "md", className = "", ...props }) {
  const variants = {
    primary: "bg-blue-700 text-white hover:bg-blue-800 shadow-sm shadow-blue-700/20",
    secondary: "border border-blue-100 bg-white text-slate-700 hover:bg-blue-50",
    ghost: "text-slate-600 hover:bg-blue-50 hover:text-blue-700",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };
  const sizes = {
    sm: "px-3 py-2 text-xs",
    md: "px-4 py-2.5 text-sm",
    lg: "px-5 py-3 text-sm",
  };

  return (
    <button className={`inline-flex items-center justify-center gap-2 rounded-2xl font-black transition ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  );
}

function Badge({ children, tone = "blue" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 ring-blue-100",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    red: "bg-red-50 text-red-700 ring-red-100",
    violet: "bg-violet-50 text-violet-700 ring-violet-100",
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
  };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ring-1 ${tones[tone] || tones.blue}`}>{children}</span>;
}

function StatusBadge({ status }) {
  const normalized = status.toLowerCase();
  let tone = "slate";
  if (["approved", "ready", "done", "complete"].includes(normalized)) tone = "green";
  if (["new", "in progress", "estimate sent"].includes(normalized)) tone = "blue";
  if (["blocked"].includes(normalized)) tone = "red";
  if (["due today", "site visit", "waiting"].includes(normalized)) tone = "amber";
  if (["scheduled", "ready to bill"].includes(normalized)) tone = "violet";
  return <Badge tone={tone}>{status}</Badge>;
}

function Card({ children, className = "" }) {
  return <div className={`panel-sheen rounded-3xl border border-blue-100 bg-white/95 shadow-panel ${className}`}>{children}</div>;
}

function PageHeader({ eyebrow, title, description, actions, tabs }) {
  return (
    <div className="mb-5 border-b border-blue-100/80 bg-white/80 px-5 py-5 backdrop-blur sm:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">{eyebrow}</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{title}</h1>
          {description ? <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      {tabs ? <div className="mt-5 flex gap-2 overflow-x-auto pb-1">{tabs}</div> : null}
    </div>
  );
}

function SectionHeader({ title, description, action }) {
  return (
    <div className="mb-3 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-base font-black text-slate-950">{title}</h2>
        {description ? <p className="mt-1 text-sm leading-5 text-slate-500">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function FilterBar({ filters, active, setActive, search, setSearch, placeholder = "Search..." }) {
  return (
    <div className="flex flex-col gap-3 border-b border-blue-100 bg-blue-50/60 p-3 md:flex-row md:items-center md:justify-between">
      <div className="flex gap-2 overflow-x-auto">
        {filters.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setActive(filter)}
            className={`rounded-2xl px-3 py-2 text-xs font-black ${active === filter ? "bg-blue-700 text-white" : "bg-white text-slate-600 ring-1 ring-blue-100 hover:bg-blue-50"}`}
          >
            {filter}
          </button>
        ))}
      </div>
      <input className="field-input w-full md:w-72" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={placeholder} />
    </div>
  );
}

function CustomerFilterHeader({ filters, active, setActive, search, setSearch, placeholder = "Search..." }) {
  const layout = getCustomerFilterLayoutClasses();

  return (
    <div className={layout.header}>
      <div className={layout.pillsRow}>
        {filters.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setActive(filter)}
            className={`rounded-2xl px-3 py-2 text-xs font-black ${active === filter ? "bg-blue-700 text-white" : "bg-white text-slate-600 ring-1 ring-blue-100 hover:bg-blue-50"}`}
          >
            {filter}
          </button>
        ))}
      </div>
      <div className={layout.searchRow}>
        <input className={layout.searchInput} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={placeholder} />
      </div>
    </div>
  );
}

function InputField({ label, ...props }) {
  return (
    <label className="field-label">
      <span>{label}</span>
      <input className="field-input" {...props} />
    </label>
  );
}

function SelectField({ label, children, ...props }) {
  return (
    <label className="field-label">
      <span>{label}</span>
      <select className="field-input" {...props}>
        {children}
      </select>
    </label>
  );
}

function TextAreaField({ label, ...props }) {
  return (
    <label className="field-label">
      <span>{label}</span>
      <textarea className="field-input min-h-28 resize-y" {...props} />
    </label>
  );
}

function ErrorBanner({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div className="mx-5 mt-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-6 lg:mx-8">
      <div className="flex items-start justify-between gap-3">
        <p>{message}</p>
        <button type="button" className="font-black" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  );
}

function SaveStateText({ saveState, align = "left" }) {
  const palette = {
    idle: "text-slate-400",
    pending: "text-amber-600",
    saving: "text-blue-700",
    saved: "text-emerald-700",
    error: "text-red-700",
  };

  return (
    <p className={`text-xs font-black uppercase tracking-[0.14em] ${palette[saveState.status] || palette.idle} ${align === "right" ? "text-right" : ""}`}>
      {saveState.message}
    </p>
  );
}

function TimestampMeta({ createdAt, updatedAt }) {
  return (
    <div className="grid gap-2 rounded-2xl border border-blue-100 bg-blue-50/60 p-3 text-xs text-slate-600 md:grid-cols-2">
      <div>
        <p className="font-black uppercase tracking-[0.14em] text-slate-400">Created</p>
        <p className="mt-1 font-bold text-slate-700">{formatDateTime(createdAt)}</p>
      </div>
      <div>
        <p className="font-black uppercase tracking-[0.14em] text-slate-400">Last updated</p>
        <p className="mt-1 font-bold text-slate-700">{formatDateTime(updatedAt)}</p>
      </div>
    </div>
  );
}

function AuditActionBadge({ action }) {
  const tones = {
    created: "green",
    updated: "blue",
    converted: "violet",
    completed: "green",
    reopened: "amber",
    archived: "slate",
    restored: "blue",
    deleted: "red",
    reset: "red",
  };

  return <Badge tone={tones[action] || "slate"}>{action}</Badge>;
}

function LoadingScreen({ label = "Loading workspace..." }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent p-6">
      <Card className="w-full max-w-md p-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-blue-700 text-white">
          <Icon name="database" className="h-6 w-6" />
        </div>
        <p className="mt-4 text-lg font-black text-slate-950">{label}</p>
        <p className="mt-2 text-sm text-slate-500">Reconnecting to the Concrete Ops API.</p>
      </Card>
    </div>
  );
}

function LoginScreen({
  credentials,
  setCredentials,
  onSubmit,
  loading,
  error,
  backendStatus,
  setupStatus,
  setupDraft,
  setSetupDraft,
  onSetupSubmit,
}) {
  const backendTone = backendStatus === "online" ? "green" : backendStatus === "offline" ? "red" : "amber";
  const backendLabel = backendStatus === "online" ? "API online" : backendStatus === "offline" ? "API offline" : "Checking API";
  const isSetupMode = backendStatus === "online" && setupStatus.checked && setupStatus.needsSetup;
  const canShowDemoCredentials = setupStatus.demoUserExists && !isSetupMode;
  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent p-6">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="overflow-hidden p-8">
          <Badge tone="blue">API-backed workspace</Badge>
          <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950">Concrete operations that actually persist.</h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
            This version runs with a real Node API, token auth, and server-backed records for leads, jobs, queue items, and activity.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-blue-100 bg-white p-4">
              <p className="text-sm font-black text-slate-950">Auth</p>
              <p className="mt-2 text-sm text-slate-500">Login, logout, and first-run admin setup are backed by API requests.</p>
            </div>
            <div className="rounded-3xl border border-blue-100 bg-white p-4">
              <p className="text-sm font-black text-slate-950">Persistence</p>
              <p className="mt-2 text-sm text-slate-500">Data lives in SQLite with migrations, backups, and request tracing.</p>
            </div>
            <div className="rounded-3xl border border-blue-100 bg-white p-4">
              <p className="text-sm font-black text-slate-950">Deployment-ready</p>
              <p className="mt-2 text-sm text-slate-500">Fresh production installs can now bootstrap a real admin without shipping a default demo user.</p>
            </div>
          </div>
        </Card>
        <Card className="p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-700 text-white">
              <Icon name="lock" className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-950">{isSetupMode ? "Set up workspace" : "Sign in"}</p>
              <p className="text-sm text-slate-500">
                {isSetupMode ? "Create the first admin account for this deployment." : canShowDemoCredentials ? "Use the seeded demo account or your own admin user." : "Enter the admin account for this workspace."}
              </p>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-between rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-slate-600">
            <span>
              {backendStatus === "online" && !setupStatus.checked
                ? "Checking workspace setup state."
                : "If login fails with a connection error, the frontend cannot see the Node API."}
            </span>
            <Badge tone={backendTone}>{backendLabel}</Badge>
          </div>
          {isSetupMode ? (
            <form className="mt-6 grid gap-4" onSubmit={onSetupSubmit}>
              <InputField label="Full name" value={setupDraft.name} onChange={(event) => setSetupDraft((current) => ({ ...current, name: event.target.value }))} />
              <InputField label="Email" type="email" value={setupDraft.email} onChange={(event) => setSetupDraft((current) => ({ ...current, email: event.target.value }))} />
              <InputField label="Password" type="password" value={setupDraft.password} onChange={(event) => setSetupDraft((current) => ({ ...current, password: event.target.value }))} />
              <InputField label="Role" value={setupDraft.role} onChange={(event) => setSetupDraft((current) => ({ ...current, role: event.target.value }))} />
              {error ? <p className="rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
              <Button type="submit" disabled={loading} className={loading ? "opacity-70" : ""}>
                {loading ? "Creating admin..." : "Create admin and enter workspace"}
              </Button>
            </form>
          ) : (
            <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
              <InputField label="Email" type="email" value={credentials.email} onChange={(event) => setCredentials((current) => ({ ...current, email: event.target.value }))} />
              <InputField label="Password" type="password" value={credentials.password} onChange={(event) => setCredentials((current) => ({ ...current, password: event.target.value }))} />
              {error ? <p className="rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
              <Button type="submit" disabled={loading} className={loading ? "opacity-70" : ""}>
                {loading ? "Signing in..." : "Enter workspace"}
              </Button>
            </form>
          )}
          <div className="mt-4 rounded-2xl border border-blue-100 bg-white p-4 text-sm text-slate-600">
            <p className="font-black text-slate-950">How to run it</p>
            <p className="mt-2">Use `npm run dev` while developing, or `npm run build` then `npm run serve` for the production build.</p>
            <p className="mt-2">A static frontend alone cannot handle login because this app needs the bundled Node API.</p>
          </div>
          {canShowDemoCredentials ? (
            <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-slate-600">
              <p className="font-black text-slate-950">Demo credentials</p>
              <p className="mt-2">
                Email: <span className="font-black text-blue-700">ops@lastyard.test</span>
              </p>
              <p>
                Password: <span className="font-black text-blue-700">concrete123</span>
              </p>
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}

function Sidebar({ active, setActive, counts }) {
  return (
    <aside className="hidden h-screen w-72 shrink-0 border-r border-blue-100 bg-white/90 backdrop-blur lg:sticky lg:top-0 lg:block">
      <div className="border-b border-blue-100 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-700 text-sm font-black text-white">CO</div>
          <div>
            <p className="text-sm font-black leading-none text-slate-950">{APP_NAME}</p>
            <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Authenticated Workspace</p>
          </div>
        </div>
      </div>
      <div className="flex h-[calc(100vh-76px)] flex-col justify-between overflow-y-auto p-3">
        <div>
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-4">
              <p className="mb-1 px-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{group.label}</p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = active === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActive(item.id)}
                      className={`flex w-full items-center justify-between gap-2.5 rounded-2xl px-3 py-2.5 text-left text-sm font-bold transition ${isActive ? "bg-blue-700 text-white" : "text-slate-600 hover:bg-blue-50 hover:text-blue-700"}`}
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <Icon name={item.icon} className="h-4 w-4" />
                        <span className="truncate">{item.label}</span>
                      </span>
                      {counts[item.id] ? (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${isActive ? "bg-white/20 text-white" : "bg-blue-50 text-blue-700"}`}>{counts[item.id]}</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <Card className="p-4">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Server-backed mode</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">Records and auth now round-trip through the local API instead of living only in the browser.</p>
        </Card>
      </div>
    </aside>
  );
}

function TopBar({ active, setActive, stats, user, onLogout, syncing, saveSummary }) {
  const current = NAV_GROUPS.flatMap((group) => group.items).find((item) => item.id === active);
  return (
    <div className="sticky top-0 z-30 border-b border-blue-100 bg-white/90 backdrop-blur">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-700">{COMPANY_NAME}</p>
          <p className="truncate text-sm font-black text-slate-950">{current?.label || "Dashboard"}</p>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          {saveSummary ? <Badge tone={saveSummary.tone}>{saveSummary.label}</Badge> : null}
          <Badge tone="blue">{stats.newLeads} new leads</Badge>
          <Badge tone="amber">{stats.reportsDue} reports due</Badge>
          <div className="rounded-full bg-blue-100 px-3 py-2 text-xs font-black text-blue-700">{user?.name || "User"}</div>
          <Button variant="ghost" size="sm" onClick={onLogout}>
            Log out
          </Button>
        </div>
        <select value={active} onChange={(event) => setActive(event.target.value)} className="field-input w-40 py-2 text-xs font-black text-blue-700 md:hidden">
          {NAV_GROUPS.flatMap((group) => group.items).map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
      {syncing ? <div className="h-1 bg-gradient-to-r from-blue-200 via-blue-600 to-blue-200" /> : null}
    </div>
  );
}

function KpiCard({ item }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">{item.label}</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{item.value}</p>
          <p className="mt-1 text-sm font-bold text-slate-500">{item.helper}</p>
        </div>
        <div className="rounded-2xl bg-blue-50 p-2.5 text-blue-700">
          <Icon name={item.icon} />
        </div>
      </div>
    </Card>
  );
}

function LeadsTable({ rows, selectedId, onSelect }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-left">
        <thead className="border-b border-blue-100 bg-slate-50 text-[11px] font-black uppercase tracking-widest text-slate-500">
          <tr>
            <th className="px-4 py-3">Lead</th>
            <th className="px-4 py-3">Project</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Priority</th>
            <th className="px-4 py-3">Value</th>
            <th className="px-4 py-3">Owner</th>
            <th className="px-4 py-3">Next step</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-blue-50">
          {rows.map((row) => {
            const selected = row.id === selectedId;
            return (
              <tr key={row.id} onClick={() => onSelect(row.id)} className={`cursor-pointer transition hover:bg-blue-50/60 ${selected ? "bg-blue-50/80" : ""}`}>
                <td className="px-4 py-3">
                  <p className="font-black text-slate-950">{row.customer}</p>
                  <p className="text-xs font-bold text-slate-500">{row.id} · {row.city}</p>
                </td>
                <td className="px-4 py-3 text-sm font-bold text-slate-700">{row.project}</td>
                <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                <td className="px-4 py-3"><Badge tone={row.priority === "High" ? "amber" : row.priority === "Low" ? "slate" : "blue"}>{row.priority}</Badge></td>
                <td className="px-4 py-3 text-sm font-black text-slate-950">{currency(row.value)}</td>
                <td className="px-4 py-3 text-sm font-bold text-slate-500">{row.owner}</td>
                <td className="px-4 py-3 text-sm font-bold text-slate-500">{row.nextStep}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function JobsTable({ rows, selectedId, onSelect }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-left">
        <thead className="border-b border-blue-100 bg-slate-50 text-[11px] font-black uppercase tracking-widest text-slate-500">
          <tr>
            <th className="px-4 py-3">Job</th>
            <th className="px-4 py-3">Customer</th>
            <th className="px-4 py-3">Stage</th>
            <th className="px-4 py-3">Crew</th>
            <th className="px-4 py-3">Next step</th>
            <th className="px-4 py-3">Due</th>
            <th className="px-4 py-3">Progress</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-blue-50">
          {rows.map((row) => {
            const selected = row.id === selectedId;
            return (
              <tr key={row.id} onClick={() => onSelect(row.id)} className={`cursor-pointer transition hover:bg-blue-50/60 ${selected ? "bg-blue-50/80" : ""}`}>
                <td className="px-4 py-3">
                  <p className="font-black text-slate-950">{row.job}</p>
                  <p className="text-xs font-bold text-slate-500">{row.id}</p>
                </td>
                <td className="px-4 py-3 text-sm font-bold text-slate-700">{row.customer}</td>
                <td className="px-4 py-3"><StatusBadge status={row.stage} /></td>
                <td className="px-4 py-3 text-sm font-bold text-slate-700">{row.crew}</td>
                <td className="px-4 py-3 text-sm font-bold text-slate-500">{row.next}</td>
                <td className="px-4 py-3 text-sm font-black text-slate-950">{row.due}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-28 overflow-hidden rounded-full bg-blue-50">
                      <div className="h-full rounded-full bg-blue-700" style={{ width: `${row.progress}%` }} />
                    </div>
                    <span className="text-xs font-black text-slate-500">{row.progress}%</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function QueueList({ items, onToggleTask, onArchiveTask, onRestoreTask, onDeleteTask, taskDraft, setTaskDraft, onAddTask, disabled }) {
  const activeItems = items.filter((item) => !item.archivedAt);
  const archivedItems = items.filter((item) => item.archivedAt);
  return (
    <Card className="p-4">
      <SectionHeader title="Today's Queue" description="Only work that actually needs motion right now." />
      <div className="space-y-2">
        {activeItems.map((item) => (
          <div key={item.id} className={`rounded-2xl border p-3 transition ${item.done ? "border-emerald-100 bg-emerald-50/60" : "border-blue-100 bg-white hover:bg-blue-50/50"}`}>
            <div className="flex items-start justify-between gap-3">
              <button type="button" onClick={() => onToggleTask(item.id)} disabled={disabled} className="flex min-w-0 flex-1 items-start gap-3 text-left">
                <span className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border ${item.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-blue-200 bg-white text-transparent"}`}>
                  <Icon name="check" className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <p className={`text-sm font-black ${item.done ? "text-emerald-800 line-through" : "text-slate-950"}`}>{item.title}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">{item.meta}</p>
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Updated {formatDateTime(item.updatedAt)}</p>
                </div>
              </button>
              <StatusBadge status={item.done ? "Done" : item.status} />
            </div>
            <div className="mt-3 flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => onArchiveTask(item.id)} disabled={disabled}>Archive</Button>
            </div>
          </div>
        ))}
      </div>
      {archivedItems.length > 0 ? (
        <div className="mt-4 space-y-2">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Archived queue</p>
          {archivedItems.slice(0, 3).map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-700">{item.title}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">{item.meta}</p>
                </div>
                <Badge tone="slate">Archived</Badge>
              </div>
              <div className="mt-3 flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => onRestoreTask(item.id)} disabled={disabled}>Restore</Button>
                <Button variant="ghost" size="sm" onClick={() => onDeleteTask(item.id)} disabled={disabled}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
      <form className="mt-4 grid gap-3" onSubmit={onAddTask}>
        <InputField label="Add queue item" value={taskDraft.title} onChange={(event) => setTaskDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Send concrete order" />
        <InputField label="Context" value={taskDraft.meta} onChange={(event) => setTaskDraft((current) => ({ ...current, meta: event.target.value }))} placeholder="Job, customer, or blocker" />
        <div className="flex items-end gap-3">
          <SelectField label="Status" value={taskDraft.status} onChange={(event) => setTaskDraft((current) => ({ ...current, status: event.target.value }))}>
            <option>Due today</option>
            <option>Ready</option>
            <option>This week</option>
            <option>Blocked</option>
          </SelectField>
          <Button className="mb-0.5 shrink-0" type="submit" disabled={disabled}>
            <Icon name="plus" />
            Add task
          </Button>
        </div>
      </form>
    </Card>
  );
}

function LeadDetailPanel({
  lead,
  onFieldChange,
  onCreateJob,
  onConvertToCustomer = () => {},
  onArchive,
  onRestore,
  onDelete,
  onSelectCustomer = () => {},
  related = { customer: null, activity: [], statusHistory: [] },
  users = [],
  customers = [],
  disabled,
  saveState,
  canManage = true,
}) {
  if (!lead) {
    return (
      <Card className="p-5">
        <SectionHeader title="Lead details" description="Select a lead to edit ownership, next steps, and notes." />
        <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50 p-6 text-center text-sm text-slate-500">Pick a lead from the table to inspect and update it.</div>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <SectionHeader
        title={lead.customer}
        description={`${lead.id} · ${lead.city}`}
        action={
          <div className="flex flex-wrap gap-2">
            {!canManage ? <Badge tone="slate">Read only</Badge> : null}
            {lead.archivedAt ? <Badge tone="slate">Archived</Badge> : null}
            <Button size="sm" onClick={onConvertToCustomer} disabled={disabled || Boolean(lead.archivedAt) || !canManage}>
              <Icon name="users" />
              Convert to customer
            </Button>
            <Button size="sm" onClick={onCreateJob} disabled={disabled || Boolean(lead.archivedAt) || !canManage}>
              <Icon name="arrowUpRight" />
              Create job
            </Button>
            {lead.archivedAt ? (
              <>
                <Button variant="secondary" size="sm" onClick={onRestore} disabled={disabled || !canManage}>Restore</Button>
                <Button variant="danger" size="sm" onClick={onDelete} disabled={disabled || !canManage}>Delete</Button>
              </>
            ) : (
              <Button variant="secondary" size="sm" onClick={onArchive} disabled={disabled || !canManage}>Archive</Button>
            )}
          </div>
        }
      />
      <SaveStateText saveState={saveState} />
      <div className="grid gap-3">
        <TimestampMeta createdAt={lead.createdAt} updatedAt={lead.updatedAt} />
        <InputField label="Project" value={lead.project} onChange={(event) => onFieldChange("project", event.target.value)} disabled={!canManage || disabled} />
        <div className="grid gap-3 md:grid-cols-3">
          <SelectField label="Status" value={lead.status} onChange={(event) => onFieldChange("status", event.target.value)} disabled={!canManage || disabled}>
            <option>New</option>
            <option>Contacted</option>
            <option>Site Visit</option>
            <option>Estimate Sent</option>
            <option>Approved</option>
          </SelectField>
          <SelectField label="Priority" value={lead.priority} onChange={(event) => onFieldChange("priority", event.target.value)} disabled={!canManage || disabled}>
            <option>Low</option>
            <option>Normal</option>
            <option>High</option>
          </SelectField>
          <SelectField label="Lead source" value={lead.source || "Call-in"} onChange={(event) => onFieldChange("source", event.target.value)} disabled={!canManage || disabled}>
            <option>Website</option>
            <option>Referral</option>
            <option>Call-in</option>
            <option>Drive-by</option>
            <option>Repeat Customer</option>
            <option>Partner</option>
          </SelectField>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <SelectField label="Owner" value={lead.ownerId || ""} onChange={(event) => onFieldChange("ownerId", event.target.value)} disabled={!canManage || disabled}>
            <option value="">Unassigned</option>
            {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
          </SelectField>
          <InputField label="Follow-up due" type="date" value={lead.followUpDueAt || ""} onChange={(event) => onFieldChange("followUpDueAt", event.target.value)} disabled={!canManage || disabled} />
          <InputField label="Value" type="number" value={lead.value} onChange={(event) => onFieldChange("value", Number(event.target.value))} disabled={!canManage || disabled} />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <SelectField label="Linked customer" value={lead.customerId || ""} onChange={(event) => onFieldChange("customerId", event.target.value)} disabled={!canManage || disabled}>
            <option value="">Create or match automatically</option>
            {customers.filter((customer) => !customer.archivedAt).map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
          </SelectField>
          <InputField label="City" value={lead.city} onChange={(event) => onFieldChange("city", event.target.value)} disabled={!canManage || disabled} />
        </div>
        <InputField label="Next step" value={lead.nextStep} onChange={(event) => onFieldChange("nextStep", event.target.value)} disabled={!canManage || disabled} />
        <TextAreaField label="Notes" value={lead.notes} onChange={(event) => onFieldChange("notes", event.target.value)} disabled={!canManage || disabled} />
        <Card className="p-4">
          <SectionHeader title="Related customer" description="Keep the lead connected to the right customer record." />
          {related.customer ? (
            <button type="button" onClick={() => onSelectCustomer(related.customer.id)} className="w-full rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-left hover:bg-blue-50">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-black text-slate-950">{related.customer.name}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">{related.customer.city || "No city"} · {related.customer.id}</p>
                </div>
                <StatusBadge status={related.customer.archivedAt ? "Archived" : related.customer.status} />
              </div>
            </button>
          ) : (
            <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50 p-4 text-sm text-slate-500">This lead is not linked to a customer record yet.</div>
          )}
        </Card>
        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="p-4">
            <SectionHeader title="Status history" description="Track how the opportunity moved through the pipeline." />
            <div className="space-y-3">
              {related.statusHistory.length === 0 ? <p className="text-sm text-slate-500">No status changes yet.</p> : related.statusHistory.slice(0, 6).map((entry) => (
                <div key={entry.id} className="rounded-2xl border border-blue-100 bg-white p-3">
                  <p className="text-sm font-black text-slate-950">{entry.fromStatus ? `${entry.fromStatus} -> ${entry.toStatus}` : entry.toStatus}</p>
                  <p className="mt-1 text-xs text-slate-500">{entry.note || "No note"}</p>
                  <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{formatDateTime(entry.createdAt)}</p>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-4">
            <SectionHeader title="Recent activity" description="Customer and lead activity tied to this opportunity." />
            <div className="space-y-3">
              {related.activity.length === 0 ? <p className="text-sm text-slate-500">No recent activity.</p> : related.activity.slice(0, 6).map((item) => (
                <div key={item.id} className="rounded-2xl border border-blue-100 bg-white p-3">
                  <p className="text-sm font-black text-slate-950">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.detail}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </Card>
  );
}

function JobDetailPanel({ job, onFieldChange, onArchive, onRestore, onDelete, saveState, disabled }) {
  if (!job) {
    return (
      <Card className="p-5">
        <SectionHeader title="Job details" description="Select a job to update stage, progress, and field notes." />
        <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50 p-6 text-center text-sm text-slate-500">Choose a job from the table to keep the field and office teams aligned.</div>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <SectionHeader
        title={job.job}
        description={`${job.id} · ${job.customer}`}
        action={
          <div className="flex flex-wrap gap-2">
            {job.archivedAt ? <Badge tone="slate">Archived</Badge> : null}
            {job.archivedAt ? (
              <>
                <Button variant="secondary" size="sm" onClick={onRestore} disabled={disabled}>Restore</Button>
                <Button variant="danger" size="sm" onClick={onDelete} disabled={disabled}>Delete</Button>
              </>
            ) : (
              <Button variant="secondary" size="sm" onClick={onArchive} disabled={disabled}>Archive</Button>
            )}
          </div>
        }
      />
      <SaveStateText saveState={saveState} />
      <div className="grid gap-3">
        <TimestampMeta createdAt={job.createdAt} updatedAt={job.updatedAt} />
        <InputField label="Customer" value={job.customer} onChange={(event) => onFieldChange("customer", event.target.value)} />
        <InputField label="Crew" value={job.crew} onChange={(event) => onFieldChange("crew", event.target.value)} />
        <div className="grid gap-3 md:grid-cols-2">
          <SelectField label="Stage" value={job.stage} onChange={(event) => onFieldChange("stage", event.target.value)}>
            <option>Scheduled</option>
            <option>In Progress</option>
            <option>Waiting</option>
            <option>Ready to Bill</option>
            <option>Complete</option>
          </SelectField>
          <InputField label="Due" value={job.due} onChange={(event) => onFieldChange("due", event.target.value)} />
        </div>
        <label className="field-label">
          <span>Progress ({job.progress}%)</span>
          <input className="w-full accent-blue-700" type="range" min="0" max="100" value={job.progress} onChange={(event) => onFieldChange("progress", Number(event.target.value))} />
        </label>
        <InputField label="Next step" value={job.next} onChange={(event) => onFieldChange("next", event.target.value)} />
        <TextAreaField label="Notes" value={job.notes} onChange={(event) => onFieldChange("notes", event.target.value)} />
      </div>
    </Card>
  );
}

function StateCard({ title, description, tone = "blue" }) {
  const tones = {
    blue: "border-blue-200 bg-blue-50 text-slate-600",
    red: "border-red-100 bg-red-50 text-red-700",
    slate: "border-slate-200 bg-slate-50 text-slate-600",
  };

  return (
    <div className={`rounded-2xl border p-6 text-center ${tones[tone] || tones.blue}`}>
      <p className="font-black text-slate-950">{title}</p>
      <p className="mt-2 text-sm">{description}</p>
    </div>
  );
}

function CustomersTable({ rows, selectedId, onSelect }) {
  return (
    <table className="w-full min-w-[980px] text-left">
      <thead className="border-b border-blue-100 bg-slate-50 text-[11px] font-black uppercase tracking-widest text-slate-500">
        <tr>
          <th className="px-4 py-3">Customer</th>
          <th className="px-4 py-3">Status</th>
          <th className="px-4 py-3">Phone</th>
          <th className="px-4 py-3">Email</th>
          <th className="px-4 py-3">City</th>
          <th className="px-4 py-3">Service area</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-blue-50">
        {rows.map((customer) => {
          const selected = customer.id === selectedId;
          return (
            <tr key={customer.id} onClick={() => onSelect(customer.id)} className={`cursor-pointer transition hover:bg-blue-50/60 ${selected ? "bg-blue-50/80" : ""}`}>
              <td className="px-4 py-3">
                <p className="font-black text-slate-950">{customer.name}</p>
                <p className="text-xs font-bold text-slate-500">{customer.company || customer.id}</p>
              </td>
              <td className="px-4 py-3"><StatusBadge status={customer.archivedAt ? "Archived" : customer.status} /></td>
              <td className="px-4 py-3 text-sm font-bold text-slate-700">{customer.phone || "Not set"}</td>
              <td className="px-4 py-3 text-sm font-bold text-slate-700">{customer.email || "Not set"}</td>
              <td className="px-4 py-3 text-sm font-bold text-slate-500">{customer.city || "Not set"}</td>
              <td className="px-4 py-3 text-sm font-bold text-slate-500">{customer.serviceArea || "Not set"}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function CustomerIntakeCard({ draft, setDraft, onCreateCustomer, disabled, canManage }) {
  if (!canManage) {
    return (
      <Card className="p-5">
        <SectionHeader title="New customer" description="Customer creation is restricted to owner/admin roles." />
        <StateCard title="Read-only access" description="You can review linked customers here, but only office leadership can create or update them." tone="slate" />
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <SectionHeader title="New customer" description="Create a durable customer record with contact and service-area details." />
      <form className="grid gap-3" onSubmit={onCreateCustomer}>
        <div className="grid gap-3 md:grid-cols-2">
          <InputField label="Customer name" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Dana Martinez" />
          <InputField label="Company" value={draft.company} onChange={(event) => setDraft((current) => ({ ...current, company: event.target.value }))} placeholder="Optional" />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <InputField label="Phone" value={draft.phone} onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))} placeholder="503-555-0199" />
          <InputField label="Email" type="email" value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} placeholder="dana@example.com" />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <InputField label="City" value={draft.city} onChange={(event) => setDraft((current) => ({ ...current, city: event.target.value }))} placeholder="Salem" />
          <InputField label="Service area" value={draft.serviceArea} onChange={(event) => setDraft((current) => ({ ...current, serviceArea: event.target.value }))} placeholder="Mid-Valley" />
          <SelectField label="Status" value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}>
            <option>Prospect</option>
            <option>Active</option>
            <option>Inactive</option>
          </SelectField>
        </div>
        <TextAreaField label="Notes" value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Preferred finish, scheduling constraints, gate access..." />
        <Button type="submit" disabled={disabled}>
          <Icon name="plus" />
          Add customer
        </Button>
      </form>
    </Card>
  );
}

function RelatedRecordsCard({ title, description, emptyLabel, items, renderItem }) {
  return (
    <Card className="p-5">
      <SectionHeader title={title} description={description} />
      {items.length === 0 ? (
        <StateCard title={emptyLabel} description={`No ${title.toLowerCase()} are linked yet.`} tone="slate" />
      ) : (
        <div className="space-y-3">
          {items.map(renderItem)}
        </div>
      )}
    </Card>
  );
}

function CustomerDetailPanel({
  customer,
  canView,
  canManage,
  notFound,
  disabled,
  saveState,
  onFieldChange,
  onArchive,
  onRestore,
  related,
  onSelectLead,
  onSelectJob,
}) {
  if (!canView) {
    return (
      <Card className="p-5">
        <SectionHeader title="Customer details" description="Customer access follows role permissions." />
        <StateCard title="Customer access unavailable" description="This role cannot open the customer workspace right now." tone="slate" />
      </Card>
    );
  }

  if (notFound) {
    return (
      <Card className="p-5">
        <SectionHeader title="Customer details" description="The requested customer route does not match an available record." />
        <StateCard title="Customer not found" description="The customer may have been archived, removed from your access scope, or never existed." tone="red" />
      </Card>
    );
  }

  if (!customer) {
    return (
      <Card className="p-5">
        <SectionHeader title="Customer details" description="Select a customer to view contact details and linked work." />
        <StateCard title="No customer selected" description="Pick a customer from the list to inspect their activity, leads, and jobs." tone="slate" />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <SectionHeader
          title={customer.name}
          description={`${customer.id} · ${customer.city || customer.serviceArea || "No service area yet"}`}
          action={
            <div className="flex flex-wrap gap-2">
              {!canManage ? <Badge tone="slate">Read only</Badge> : null}
              {customer.archivedAt ? <Badge tone="slate">Archived</Badge> : null}
              {canManage ? (
                customer.archivedAt ? (
                  <Button variant="secondary" size="sm" onClick={onRestore} disabled={disabled}>Restore</Button>
                ) : (
                  <Button variant="secondary" size="sm" onClick={onArchive} disabled={disabled}>Archive</Button>
                )
              ) : null}
            </div>
          }
        />
        <SaveStateText saveState={saveState} />
        <div className="grid gap-3">
          <TimestampMeta createdAt={customer.createdAt} updatedAt={customer.updatedAt} />
          <div className="grid gap-3 md:grid-cols-2">
            <InputField label="Customer name" value={customer.name} onChange={(event) => onFieldChange("name", event.target.value)} disabled={!canManage || disabled} />
            <InputField label="Company" value={customer.company} onChange={(event) => onFieldChange("company", event.target.value)} disabled={!canManage || disabled} />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <InputField label="Phone" value={customer.phone} onChange={(event) => onFieldChange("phone", event.target.value)} disabled={!canManage || disabled} />
            <InputField label="Email" value={customer.email} onChange={(event) => onFieldChange("email", event.target.value)} disabled={!canManage || disabled} />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <InputField label="City" value={customer.city} onChange={(event) => onFieldChange("city", event.target.value)} disabled={!canManage || disabled} />
            <InputField label="Service area" value={customer.serviceArea} onChange={(event) => onFieldChange("serviceArea", event.target.value)} disabled={!canManage || disabled} />
            <SelectField label="Status" value={customer.status} onChange={(event) => onFieldChange("status", event.target.value)} disabled={!canManage || disabled}>
              <option>Prospect</option>
              <option>Active</option>
              <option>Inactive</option>
            </SelectField>
          </div>
          <TextAreaField label="Notes" value={customer.notes} onChange={(event) => onFieldChange("notes", event.target.value)} disabled={!canManage || disabled} />
        </div>
      </Card>

      <RelatedRecordsCard
        title="Related leads"
        description="Open opportunities connected to this customer."
        emptyLabel="No linked leads"
        items={related.leads}
        renderItem={(lead) => (
          <button key={lead.id} type="button" onClick={() => onSelectLead(lead.id)} className="w-full rounded-2xl border border-blue-100 bg-white p-4 text-left hover:bg-blue-50/60">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black text-slate-950">{lead.project}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">{lead.id} · {lead.city}</p>
              </div>
              <StatusBadge status={lead.status} />
            </div>
          </button>
        )}
      />

      <RelatedRecordsCard
        title="Related jobs"
        description="Scheduled or active work linked to this customer."
        emptyLabel="No linked jobs"
        items={related.jobs}
        renderItem={(job) => (
          <button key={job.id} type="button" onClick={() => onSelectJob(job.id)} className="w-full rounded-2xl border border-blue-100 bg-white p-4 text-left hover:bg-blue-50/60">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black text-slate-950">{job.job}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">{job.id} · {job.next}</p>
              </div>
              <StatusBadge status={job.stage} />
            </div>
          </button>
        )}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <RelatedRecordsCard
          title="Estimates"
          description="Estimate records will appear here once that module is built."
          emptyLabel="No linked estimates"
          items={[]}
          renderItem={() => null}
        />
        <RelatedRecordsCard
          title="Change orders"
          description="Approved scope changes will appear here when available."
          emptyLabel="No linked change orders"
          items={[]}
          renderItem={() => null}
        />
      </div>

      <RelatedRecordsCard
        title="Activity"
        description="Recent activity mentioning this customer."
        emptyLabel="No customer activity yet"
        items={related.activity.slice(0, 5)}
        renderItem={(item) => (
          <div key={item.id} className="rounded-2xl border border-blue-100 bg-white p-4">
            <p className="text-sm font-black text-slate-950">{item.title}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">{item.detail}</p>
            <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{formatDateTime(item.createdAt)}</p>
          </div>
        )}
      />
    </div>
  );
}

function ActivityPanel({ activity }) {
  return (
    <Card className="p-4">
      <SectionHeader title="Recent Activity" description="Live changes land here so the office can keep pace with the field." />
      <div className="space-y-3">
        {activity.map((item) => (
          <div key={item.id} className="border-l-2 border-blue-200 pl-3">
            <p className="text-xs font-black uppercase tracking-widest text-blue-700">{item.time}</p>
            <p className="mt-1 text-sm font-black text-slate-950">{item.title}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">{item.detail}</p>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{formatDateTime(item.createdAt)}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function AuditTrailPanel({ auditEvents }) {
  return (
    <Card className="p-5">
      <SectionHeader title="Audit trail" description="Durable backend history for record changes and resets." />
      {auditEvents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50 p-6 text-center text-sm text-slate-500">Audit history will appear here as records are created, updated, bootstrapped, converted, and reset.</div>
      ) : (
        <div className="space-y-3">
          {auditEvents.slice(0, 10).map((event) => (
            <div key={event.id} className="rounded-2xl border border-blue-100 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-950">{event.summary}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{event.detail}</p>
                </div>
                <AuditActionBadge action={event.action} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                <span>{event.entityType}</span>
                {event.entityId ? <span>{event.entityId}</span> : null}
                <span>{event.actorName}</span>
                <span>{formatDateTime(event.createdAt)}</span>
              </div>
              {event.changedFields.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {event.changedFields.map((field) => (
                    <Badge key={`${event.id}-${field}`} tone="slate">{field}</Badge>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function LeadIntakeCard({ draft, setDraft, onCreateLead, disabled, canManage, customers, users }) {
  if (!canManage) {
    return (
      <Card className="p-5">
        <SectionHeader title="New lead intake" description="Lead creation is restricted to office management roles." />
        <StateCard title="Read-only access" description="You can review the pipeline, but only owner/admin/operations roles can create or update leads." tone="slate" />
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <SectionHeader title="New lead intake" description="Create a real record in the API-backed queue." />
      <form className="grid gap-3" onSubmit={onCreateLead}>
        <div className="grid gap-3 md:grid-cols-2">
          <SelectField label="Existing customer" value={draft.customerId} onChange={(event) => {
            const selectedCustomer = customers.find((customer) => customer.id === event.target.value);
            setDraft((current) => ({
              ...current,
              customerId: event.target.value,
              customer: selectedCustomer?.name || current.customer,
              city: selectedCustomer?.city || current.city,
            }));
          }}>
            <option value="">Create or match automatically</option>
            {customers.filter((customer) => !customer.archivedAt).map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
          </SelectField>
          <InputField label="Customer" value={draft.customer} onChange={(event) => setDraft((current) => ({ ...current, customer: event.target.value }))} placeholder="Dana Martinez" />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <InputField label="City" value={draft.city} onChange={(event) => setDraft((current) => ({ ...current, city: event.target.value }))} placeholder="Albany" />
          <InputField label="Project" value={draft.project} onChange={(event) => setDraft((current) => ({ ...current, project: event.target.value }))} placeholder="Front walkway replacement" />
          <InputField label="Follow-up due" type="date" value={draft.followUpDueAt} onChange={(event) => setDraft((current) => ({ ...current, followUpDueAt: event.target.value }))} />
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <SelectField label="Status" value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}>
            <option>New</option>
            <option>Contacted</option>
            <option>Site Visit</option>
            <option>Estimate Sent</option>
            <option>Approved</option>
          </SelectField>
          <SelectField label="Priority" value={draft.priority} onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value }))}>
            <option>Low</option>
            <option>Normal</option>
            <option>High</option>
          </SelectField>
          <SelectField label="Owner" value={draft.ownerId} onChange={(event) => setDraft((current) => ({ ...current, ownerId: event.target.value }))}>
            <option value="">Unassigned</option>
            {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
          </SelectField>
          <SelectField label="Lead source" value={draft.source} onChange={(event) => setDraft((current) => ({ ...current, source: event.target.value }))}>
            <option>Website</option>
            <option>Referral</option>
            <option>Call-in</option>
            <option>Drive-by</option>
            <option>Repeat Customer</option>
            <option>Partner</option>
          </SelectField>
          <InputField label="Value" type="number" value={draft.value} onChange={(event) => setDraft((current) => ({ ...current, value: event.target.value }))} placeholder="8200" />
        </div>
        <InputField label="Next step" value={draft.nextStep} onChange={(event) => setDraft((current) => ({ ...current, nextStep: event.target.value }))} placeholder="Schedule site measure" />
        <TextAreaField label="Notes" value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Gate access, finish details, timing notes..." />
        <Button type="submit" disabled={disabled}>
          <Icon name="plus" />
          Add lead
        </Button>
      </form>
    </Card>
  );
}

function JobPlannerCard({ draft, setDraft, onCreateJob, disabled }) {
  return (
    <Card className="p-5">
      <SectionHeader title="Create job" description="Promote approved work into a scheduled field record." />
      <form className="grid gap-3" onSubmit={onCreateJob}>
        <InputField label="Job name" value={draft.job} onChange={(event) => setDraft((current) => ({ ...current, job: event.target.value }))} placeholder="Martinez Front Walk" />
        <div className="grid gap-3 md:grid-cols-2">
          <InputField label="Customer" value={draft.customer} onChange={(event) => setDraft((current) => ({ ...current, customer: event.target.value }))} />
          <InputField label="Crew" value={draft.crew} onChange={(event) => setDraft((current) => ({ ...current, crew: event.target.value }))} placeholder="Juan + 3" />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <SelectField label="Stage" value={draft.stage} onChange={(event) => setDraft((current) => ({ ...current, stage: event.target.value }))}>
            <option>Scheduled</option>
            <option>In Progress</option>
            <option>Waiting</option>
            <option>Ready to Bill</option>
          </SelectField>
          <InputField label="Due" value={draft.due} onChange={(event) => setDraft((current) => ({ ...current, due: event.target.value }))} placeholder="Wed" />
          <InputField label="Progress" type="number" min="0" max="100" value={draft.progress} onChange={(event) => setDraft((current) => ({ ...current, progress: Number(event.target.value) }))} />
        </div>
        <InputField label="Next step" value={draft.next} onChange={(event) => setDraft((current) => ({ ...current, next: event.target.value }))} placeholder="Confirm mix and pump truck" />
        <TextAreaField label="Notes" value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} />
        <Button type="submit" disabled={disabled}>
          <Icon name="plus" />
          Add job
        </Button>
      </form>
    </Card>
  );
}

function DashboardPage({
  stats,
  leads,
  jobs,
  queueItems,
  activity,
  leadFilter,
  setLeadFilter,
  leadSearch,
  setLeadSearch,
  selectedLeadId,
  onSelectLead,
  selectedJobId,
  onSelectJob,
  selectedLead,
  onLeadFieldChange,
  onCreateJobFromLead,
  onConvertLeadToCustomer,
  onArchiveLead,
  onRestoreLead,
  onDeleteLead,
  leadSaveState,
  users,
  customers,
  permissions,
  onSelectCustomer,
  relatedLeadRecords,
  taskDraft,
  setTaskDraft,
  onAddTask,
  onToggleTask,
  onArchiveTask,
  onRestoreTask,
  onDeleteTask,
  setActive,
  busy,
}) {
  const tabs = ["Today", "This Week", "Needs Action", "Ready to Bill"].map((tab, index) => (
    <button key={tab} type="button" className={`rounded-2xl px-3 py-2 text-xs font-black ${index === 0 ? "bg-blue-700 text-white" : "bg-blue-50 text-blue-700"}`}>
      {tab}
    </button>
  ));

  const visibleLeads = leads.filter((lead) => {
    const matchesArchive = leadFilter === "Archived" ? Boolean(lead.archivedAt) : !lead.archivedAt;
    const matchesFilter = leadFilter === "All" || leadFilter === "Archived" ? true : lead.status === leadFilter;
    const searchValue = leadSearch.toLowerCase();
    const matchesSearch = [lead.customer, lead.project, lead.city, lead.owner].some((value) => value.toLowerCase().includes(searchValue));
    return matchesArchive && matchesFilter && matchesSearch;
  });

  const kpis = [
    { label: "Leads needing review", value: `${stats.newLeads}`, helper: `${stats.highPriorityLeads} high priority`, icon: "inbox" },
    { label: "Pipeline open", value: currency(stats.pipelineValue), helper: `${leads.filter((lead) => !lead.archivedAt).length} active opportunities`, icon: "quote" },
    { label: "Jobs active today", value: `${stats.activeJobs}`, helper: `${stats.scheduledJobs} scheduled next`, icon: "briefcase" },
    { label: "Reports due", value: `${stats.reportsDue}`, helper: `${stats.queueBlocked} blocked items`, icon: "document" },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Operations Command"
        title="Daily workspace"
        description="The prototype now authenticates to a real API. Leads, jobs, queue actions, and activity all load from the server and stay synchronized."
        actions={
          <>
            <Button variant="secondary" onClick={() => setActive("leads")}>Open leads</Button>
            <Button onClick={() => setActive("jobs")}>Open jobs</Button>
          </>
        }
        tabs={tabs}
      />
      <div className="grid gap-4 px-5 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{kpis.map((item) => <KpiCard key={item.label} item={item} />)}</div>
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <Card className="overflow-hidden">
            <div className="p-4">
              <SectionHeader title="Lead Pipeline" description="Filter and search the live pipeline, then edit the selected record." action={<Button variant="secondary" size="sm" onClick={() => setActive("leads")}>Manage leads</Button>} />
            </div>
            <FilterBar filters={["All", "New", "Site Visit", "Estimate Sent", "Approved", "Archived"]} active={leadFilter} setActive={setLeadFilter} search={leadSearch} setSearch={setLeadSearch} placeholder="Search customer, project, city..." />
            <LeadsTable rows={visibleLeads} selectedId={selectedLeadId} onSelect={onSelectLead} />
          </Card>
          <div className="space-y-4">
            <QueueList items={queueItems} onToggleTask={onToggleTask} onArchiveTask={onArchiveTask} onRestoreTask={onRestoreTask} onDeleteTask={onDeleteTask} taskDraft={taskDraft} setTaskDraft={setTaskDraft} onAddTask={onAddTask} disabled={busy} />
            <LeadDetailPanel lead={selectedLead} onFieldChange={onLeadFieldChange} onCreateJob={onCreateJobFromLead} onConvertToCustomer={onConvertLeadToCustomer} onArchive={onArchiveLead} onRestore={onRestoreLead} onDelete={onDeleteLead} onSelectCustomer={onSelectCustomer} related={relatedLeadRecords} users={users} customers={customers} disabled={busy} saveState={leadSaveState} canManage={permissions.leads.canManage} />
          </div>
        </div>
        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="overflow-hidden">
            <div className="p-4"><SectionHeader title="Active Jobs" description="Field progress, crew ownership, and next steps from the live backend." /></div>
            <JobsTable rows={jobs.filter((job) => !job.archivedAt).slice(0, 5)} selectedId={selectedJobId} onSelect={onSelectJob} />
          </Card>
          <ActivityPanel activity={activity} />
        </div>
      </div>
    </div>
  );
}

function LeadsPage({
  rows,
  filter,
  setFilter,
  search,
  setSearch,
  ownerFilter,
  setOwnerFilter,
  sourceFilter,
  setSourceFilter,
  dueFilter,
  setDueFilter,
  users,
  customers,
  permissions,
  selectedLeadId,
  onSelectLead,
  onSelectCustomer,
  selectedLead,
  onLeadFieldChange,
  leadDraft,
  setLeadDraft,
  onCreateLead,
  onCreateJobFromLead,
  onConvertLeadToCustomer,
  onArchiveLead,
  onRestoreLead,
  onDeleteLead,
  relatedLeadRecords,
  busy,
  leadSaveState,
}) {
  return (
    <div>
      <PageHeader eyebrow="Office" title="Leads" description="This queue now reads and writes against the backend. Create fresh opportunities and keep ownership and next steps accurate." actions={<Badge tone="blue">{rows.length} records</Badge>} />
      <div className="grid gap-4 px-5 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <Card className="overflow-hidden">
          <FilterBar filters={["All", "New", "Contacted", "Site Visit", "Estimate Sent", "Approved", "Archived"]} active={filter} setActive={setFilter} search={search} setSearch={setSearch} placeholder="Search customer, project, city..." />
          <div className="grid gap-3 border-b border-blue-100 bg-blue-50/40 p-3 md:grid-cols-3">
            <SelectField label="Owner" value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)}>
              <option>All owners</option>
              {Array.from(new Set(users.map((user) => user.name))).sort().map((name) => <option key={name}>{name}</option>)}
            </SelectField>
            <SelectField label="Lead source" value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>
              <option>All sources</option>
              {["Website", "Referral", "Call-in", "Drive-by", "Repeat Customer", "Partner"].map((source) => <option key={source}>{source}</option>)}
            </SelectField>
            <SelectField label="Follow-up due" value={dueFilter} onChange={(event) => setDueFilter(event.target.value)}>
              <option>All due dates</option>
              <option>Overdue</option>
              <option>Due today</option>
              <option>Due soon</option>
              <option>No due date</option>
            </SelectField>
          </div>
          <LeadsTable rows={rows} selectedId={selectedLeadId} onSelect={onSelectLead} />
        </Card>
        <div className="space-y-4">
          <LeadIntakeCard draft={leadDraft} setDraft={setLeadDraft} onCreateLead={onCreateLead} disabled={busy} canManage={permissions.leads.canManage} customers={customers} users={users} />
          <LeadDetailPanel lead={selectedLead} onFieldChange={onLeadFieldChange} onCreateJob={onCreateJobFromLead} onConvertToCustomer={onConvertLeadToCustomer} onArchive={onArchiveLead} onRestore={onRestoreLead} onDelete={onDeleteLead} onSelectCustomer={onSelectCustomer} related={relatedLeadRecords} users={users} customers={customers} disabled={busy} saveState={leadSaveState} canManage={permissions.leads.canManage} />
        </div>
      </div>
    </div>
  );
}

function JobsPage({ rows, filter, setFilter, search, setSearch, selectedJobId, onSelectJob, selectedJob, onJobFieldChange, jobDraft, setJobDraft, onCreateJob, onArchiveJob, onRestoreJob, onDeleteJob, busy, jobSaveState }) {
  return (
    <div>
      <PageHeader eyebrow="Field Ops" title="Jobs" description="Create jobs from scratch or from approved leads, then keep field progress and next-step accountability current through the API." actions={<Badge tone="violet">{rows.length} active jobs</Badge>} />
      <div className="grid gap-4 px-5 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <Card className="overflow-hidden">
          <FilterBar filters={["All", "Scheduled", "In Progress", "Waiting", "Ready to Bill", "Complete", "Archived"]} active={filter} setActive={setFilter} search={search} setSearch={setSearch} placeholder="Search job, customer, crew..." />
          <JobsTable rows={rows} selectedId={selectedJobId} onSelect={onSelectJob} />
        </Card>
        <div className="space-y-4">
          <JobPlannerCard draft={jobDraft} setDraft={setJobDraft} onCreateJob={onCreateJob} disabled={busy} />
          <JobDetailPanel job={selectedJob} onFieldChange={onJobFieldChange} onArchive={onArchiveJob} onRestore={onRestoreJob} onDelete={onDeleteJob} saveState={jobSaveState} disabled={busy} />
        </div>
      </div>
    </div>
  );
}

function CustomersPage({
  customers,
  filter,
  setFilter,
  search,
  setSearch,
  selectedCustomerId,
  onSelectCustomer,
  selectedCustomer,
  onCustomerFieldChange,
  customerDraft,
  setCustomerDraft,
  onCreateCustomer,
  onArchiveCustomer,
  onRestoreCustomer,
  busy,
  customerSaveState,
  permissions,
  errorMessage,
  relatedRecords,
  onSelectLead,
  onSelectJob,
  customerRouteRequested,
}) {
  const canView = permissions.customers.canView;
  const canManage = permissions.customers.canManage;
  const layout = getCustomerFilterLayoutClasses();
  const debugState = useMemo(() => deriveCustomerListState(customers, {
    status: filter,
    query: search,
  }), [customers, filter, search]);
  const visibleRows = debugState.renderedRows;

  return (
    <div>
      <PageHeader eyebrow="Office" title="Customers" description="Track real customer relationships, contact info, service area, and linked work from one place." actions={<Badge tone="blue">{canView ? visibleRows.length : 0} visible customers</Badge>} />
      <div className="grid gap-4 px-5 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <Card className="overflow-hidden">
          {canView ? (
            <>
              <CustomerFilterHeader filters={["All", "Prospect", "Active", "Inactive", "Archived"]} active={filter} setActive={setFilter} search={search} setSearch={setSearch} placeholder="Search name, phone, email, city, service area..." />
              {busy && visibleRows.length === 0 ? (
                <div className="p-5"><StateCard title="Loading customers" description="Pulling customer records from the API." /></div>
              ) : errorMessage && visibleRows.length === 0 ? (
                <div className="p-5"><StateCard title="Customers unavailable" description={errorMessage} tone="red" /></div>
              ) : visibleRows.length === 0 ? (
                <div className="p-5">
                  <StateCard
                    title={search || filter !== "All" ? "No matching customers" : "No customers yet"}
                    description={search || filter !== "All" ? "Try a different search or status filter." : "Create the first customer record to start linking leads and jobs."}
                  />
                </div>
              ) : (
                <div className={layout.tableSection}>
                  <div className={layout.tableScroller}>
                    <CustomersTable rows={visibleRows} selectedId={selectedCustomerId} onSelect={onSelectCustomer} />
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-5">
              <StateCard title="Customer access unavailable" description="This role cannot open the customer workspace until customer-specific assignments exist." tone="slate" />
            </div>
          )}
        </Card>
        <div className="space-y-4">
          <CustomerIntakeCard draft={customerDraft} setDraft={setCustomerDraft} onCreateCustomer={onCreateCustomer} disabled={busy} canManage={canManage} />
          <CustomerDetailPanel
            customer={selectedCustomer}
            canView={canView}
            canManage={canManage}
            notFound={canView && customerRouteRequested && !selectedCustomer}
            disabled={busy}
            saveState={customerSaveState}
            onFieldChange={onCustomerFieldChange}
            onArchive={onArchiveCustomer}
            onRestore={onRestoreCustomer}
            related={relatedRecords}
            onSelectLead={onSelectLead}
            onSelectJob={onSelectJob}
          />
        </div>
      </div>
    </div>
  );
}

function StateExamples() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="p-5">
        <SectionHeader title="Empty state" />
        <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50 p-6 text-center">
          <p className="font-black text-slate-950">No change orders yet</p>
          <p className="mt-2 text-sm text-slate-500">Create one when scope changes, price changes, or extra work is approved.</p>
          <Button className="mt-4" size="sm">Create Change Order</Button>
        </div>
      </Card>
      <Card className="p-5">
        <SectionHeader title="Loading state" />
        <div className="space-y-3">{[1, 2, 3].map((item) => <div key={item} className="h-12 animate-pulse rounded-2xl bg-blue-50" />)}</div>
      </Card>
      <Card className="p-5">
        <SectionHeader title="Error state" />
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
          <p className="font-black text-red-700">Could not load uploads</p>
          <p className="mt-1 text-sm text-red-600">Check the storage connection and try again.</p>
          <Button variant="secondary" size="sm" className="mt-3">Retry</Button>
        </div>
      </Card>
    </div>
  );
}

function DesignSystemPage() {
  return (
    <div>
      <PageHeader eyebrow="Design System" title="Production UI standards" description="The visual system stayed intact while the app moved to real authenticated backend flows." actions={<Badge tone="blue">Live spec</Badge>} />
      <div className="grid gap-4 px-5 sm:px-6 lg:px-8">
        <Card className="p-5">
          <SectionHeader title="Tokens" description="Calm blue and white system with practical density and restrained surfaces." />
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            {TOKENS.colors.map(([name, value, use]) => (
              <div key={name} className="rounded-2xl border border-blue-100 p-3">
                <div className="h-10 rounded-xl border border-blue-100" style={{ background: value }} />
                <p className="mt-2 text-xs font-black uppercase text-slate-500">{name}</p>
                <p className="text-xs font-bold text-slate-700">{value}</p>
                <p className="mt-1 text-[11px] leading-4 text-slate-500">{use}</p>
              </div>
            ))}
          </div>
        </Card>
        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="p-5">
            <SectionHeader title="Button hierarchy" description="Primary actions move records. Utilities stay secondary." />
            <div className="flex flex-wrap gap-2">
              <Button>Primary Action</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
            </div>
          </Card>
          <Card className="p-5">
            <SectionHeader title="Density guidelines" description="Operational software should feel compact without feeling cramped." />
            <div className="space-y-2">
              {TOKENS.density.map(([name, value, use]) => (
                <div key={name} className="rounded-2xl border border-blue-100 p-3">
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-black text-slate-950">{name}</p>
                    <Badge tone="slate">{value}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{use}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <StateExamples />
      </div>
    </div>
  );
}

function CalculatorPage() {
  const [length, setLength] = useState(40);
  const [width, setWidth] = useState(20);
  const [thickness, setThickness] = useState(4);
  const [resultCopied, setResultCopied] = useState(false);
  const yards = useMemo(() => ((length * width * (thickness / 12)) / 27) * 1.1, [length, width, thickness]);

  async function copyResult() {
    try {
      await navigator.clipboard.writeText(`${yards.toFixed(2)} cubic yards`);
      setResultCopied(true);
      window.setTimeout(() => setResultCopied(false), 1500);
    } catch {
      setResultCopied(false);
    }
  }

  return (
    <div>
      <PageHeader eyebrow="Tools" title="Concrete Calculator" description="Large inputs, clear units, and a one-click copyable result for quick field use." />
      <div className="grid gap-4 px-5 sm:px-6 lg:grid-cols-[420px_1fr] lg:px-8">
        <Card className="p-5">
          <SectionHeader title="Slab input" description="Includes a 10% waste factor." />
          <div className="grid gap-3">
            <InputField label="Length (ft)" type="number" value={length} onChange={(event) => setLength(Number(event.target.value))} />
            <InputField label="Width (ft)" type="number" value={width} onChange={(event) => setWidth(Number(event.target.value))} />
            <InputField label="Thickness (in)" type="number" value={thickness} onChange={(event) => setThickness(Number(event.target.value))} />
          </div>
        </Card>
        <Card className="overflow-hidden">
          <div className="bg-blue-950 p-6 text-white">
            <p className="text-xs font-black uppercase tracking-widest text-blue-200">Recommended order</p>
            <p className="mt-3 text-6xl font-black">{yards.toFixed(2)}</p>
            <p className="text-lg font-black text-blue-100">cubic yards</p>
            <Button className="mt-5" variant="secondary" onClick={copyResult}>{resultCopied ? "Copied" : "Copy result"}</Button>
          </div>
          <div className="grid gap-3 p-6 text-sm text-slate-600 sm:grid-cols-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Square feet</p>
              <p className="mt-1 text-lg font-black text-slate-950">{length * width}</p>
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Volume</p>
              <p className="mt-1 text-lg font-black text-slate-950">{((length * width * (thickness / 12)) / 27).toFixed(2)} yd^3</p>
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Waste factor</p>
              <p className="mt-1 text-lg font-black text-slate-950">10%</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function CopilotPage({ stats, leads, jobs, queueItems }) {
  const suggestions = [
    stats.queueBlocked > 0 ? `Clear ${stats.queueBlocked} blocked queue item${stats.queueBlocked > 1 ? "s" : ""} before closeout slips.` : "Queue is clear enough to keep crews moving.",
    stats.newLeads > 0 ? `Assign callbacks for ${stats.newLeads} new lead${stats.newLeads > 1 ? "s" : ""} to keep response times tight.` : "No new leads are waiting for first contact.",
    jobs.some((job) => job.stage === "Waiting") ? "Waiting jobs need a concrete next step or owner handoff." : "No jobs are currently stalled in a waiting state.",
    leads.some((lead) => lead.status === "Approved") ? "Approved leads can be promoted into jobs directly from the lead detail panel." : "No approved leads are waiting on job creation.",
  ];

  return (
    <div>
      <PageHeader eyebrow="System" title="Ops Copilot" description="A lightweight operations summary page derived from live backend state." />
      <div className="grid gap-4 px-5 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <Card className="p-5">
          <SectionHeader title="Suggested actions" description="Derived from the current state of leads, jobs, and the queue." />
          <div className="space-y-3">
            {suggestions.map((item) => <div key={item} className="rounded-2xl border border-blue-100 bg-white p-4"><p className="text-sm font-bold text-slate-700">{item}</p></div>)}
          </div>
        </Card>
        <Card className="p-5">
          <SectionHeader title="Snapshot" description="Quick counts for the modules doing real work." />
          <div className="space-y-3 text-sm text-slate-600">
            <div className="flex items-center justify-between rounded-2xl bg-blue-50 px-3 py-2"><span>Leads</span><strong className="text-slate-950">{leads.length}</strong></div>
            <div className="flex items-center justify-between rounded-2xl bg-blue-50 px-3 py-2"><span>Jobs</span><strong className="text-slate-950">{jobs.length}</strong></div>
            <div className="flex items-center justify-between rounded-2xl bg-blue-50 px-3 py-2"><span>Queue items</span><strong className="text-slate-950">{queueItems.length}</strong></div>
            <div className="flex items-center justify-between rounded-2xl bg-blue-50 px-3 py-2"><span>Open pipeline</span><strong className="text-slate-950">{currency(stats.pipelineValue)}</strong></div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function SettingsPage({ user, onReset, busy, auditEvents, demoMode }) {
  return (
    <div>
      <PageHeader eyebrow="System" title="Settings" description={demoMode ? "This workspace uses authenticated server state with optional seeded demo data." : "This workspace uses authenticated server state with production-style admin setup."} />
      <div className="grid gap-4 px-5 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <Card className="p-5">
            <SectionHeader title="Account" description="Current signed-in operator." />
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-slate-600">
              <p><span className="font-black text-slate-950">Name:</span> {user?.name}</p>
              <p className="mt-1"><span className="font-black text-slate-950">Email:</span> {user?.email}</p>
              <p className="mt-1"><span className="font-black text-slate-950">Role:</span> {user?.role}</p>
            </div>
            {demoMode ? <Button variant="danger" className="mt-4" onClick={onReset} disabled={busy}>Reset demo data</Button> : null}
          </Card>
          <Card className="p-5">
            <SectionHeader title="Roadmap" description="Good next steps if we keep pushing this into production." />
            <div className="space-y-3 text-sm text-slate-600">
              <div className="rounded-2xl border border-blue-100 p-4">Add role-based permissions and password rotation for multiple office users.</div>
              <div className="rounded-2xl border border-blue-100 p-4">Deploy the Docker build with persistent storage and a real production domain.</div>
              <div className="rounded-2xl border border-blue-100 p-4">Split modules like reports, uploads, and estimates into their own resource APIs.</div>
            </div>
          </Card>
        </div>
        <AuditTrailPanel auditEvents={auditEvents} />
      </div>
    </div>
  );
}

function GenericPage({ active, queueItems, selectedLead, selectedJob }) {
  const item = NAV_GROUPS.flatMap((group) => group.items).find((nav) => nav.id === active);
  const previews = [
    selectedLead ? `${selectedLead.customer} · ${selectedLead.nextStep}` : "Select a lead to see live queue context.",
    selectedJob ? `${selectedJob.job} · ${selectedJob.next}` : "Select a job to keep next steps visible.",
    queueItems[0] ? `${queueItems[0].title} · ${queueItems[0].status}` : "Queue items will appear here as they are added.",
  ];

  return (
    <div>
      <PageHeader eyebrow="Module" title={item?.label || "Module"} description="This module is scaffolded with the same production primitives and can now plug into real backend state." actions={<Badge tone="slate">Scaffolded</Badge>} />
      <div className="grid gap-4 px-5 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <Card className="p-5">
          <SectionHeader title="Work queue" description="These sections are connected to live app data even before a dedicated workflow is built." />
          <div className="space-y-3">{previews.map((preview) => <div key={preview} className="rounded-2xl border border-blue-100 p-4 text-sm text-slate-600">{preview}</div>)}</div>
        </Card>
        <Card className="p-5">
          <SectionHeader title="Next build step" description="A good placeholder should tell us exactly what to build next." />
          <p className="text-sm leading-6 text-slate-600">If we keep going, this module should get its own record list, detail panel, and real status model, just like leads and jobs already do.</p>
        </Card>
      </div>
    </div>
  );
}

function MainContent(props) {
  const { active } = props;
  if (active === "dashboard") return <DashboardPage {...props} />;
  if (active === "leads") {
    return (
      <LeadsPage
        {...props}
        rows={props.visibleLeads}
        filter={props.leadFilter}
        setFilter={props.setLeadFilter}
        search={props.leadSearch}
        setSearch={props.setLeadSearch}
        ownerFilter={props.leadOwnerFilter}
        setOwnerFilter={props.setLeadOwnerFilter}
        sourceFilter={props.leadSourceFilter}
        setSourceFilter={props.setLeadSourceFilter}
        dueFilter={props.leadDueFilter}
        setDueFilter={props.setLeadDueFilter}
      />
    );
  }
  if (active === "customers") {
    return (
      <CustomersPage
        {...props}
        customers={props.customers}
        filter={props.customerFilter}
        setFilter={props.setCustomerFilter}
        search={props.customerSearch}
        setSearch={props.setCustomerSearch}
      />
    );
  }
  if (active === "jobs") return <JobsPage {...props} rows={props.visibleJobs} />;
  if (active === "calculator") return <CalculatorPage />;
  if (active === "design") return <DesignSystemPage />;
  if (active === "copilot") return <CopilotPage {...props} />;
  if (active === "settings") return <SettingsPage user={props.user} onReset={props.onReset} busy={props.busy} auditEvents={props.auditEvents} demoMode={props.demoMode} />;
  return <GenericPage active={active} queueItems={props.queueItems} selectedLead={props.selectedLead} selectedJob={props.selectedJob} />;
}

export default function App() {
  const [pathname, setPathname] = useState(() => normalizePathname(window.location.pathname));
  const [sessionToken, setSessionToken] = useState(() => window.localStorage.getItem(SESSION_TOKEN_KEY) || "");
  const [authStatus, setAuthStatus] = useState(sessionToken ? "checking" : "loggedOut");
  const [appState, setAppState] = useState(EMPTY_APP_STATE);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [loginError, setLoginError] = useState("");
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [setupDraft, setSetupDraft] = useState(INITIAL_SETUP_FORM);
  const [setupStatus, setSetupStatus] = useState(INITIAL_SETUP_STATUS);
  const [customerFilter, setCustomerFilter] = useState("All");
  const [customerSearch, setCustomerSearch] = useState("");
  const [leadFilter, setLeadFilter] = useState("All");
  const [leadSearch, setLeadSearch] = useState("");
  const [leadOwnerFilter, setLeadOwnerFilter] = useState("All owners");
  const [leadSourceFilter, setLeadSourceFilter] = useState("All sources");
  const [leadDueFilter, setLeadDueFilter] = useState("All due dates");
  const [jobFilter, setJobFilter] = useState("All");
  const [jobSearch, setJobSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [selectedJobId, setSelectedJobId] = useState("");
  const [customerDraft, setCustomerDraft] = useState(INITIAL_CUSTOMER_FORM);
  const [leadDraft, setLeadDraft] = useState(INITIAL_LEAD_FORM);
  const [jobDraft, setJobDraft] = useState(INITIAL_JOB_FORM);
  const [taskDraft, setTaskDraft] = useState(INITIAL_TASK_FORM);
  const [backendStatus, setBackendStatus] = useState("checking");
  const [recordSaveState, setRecordSaveState] = useState({
    customer: { id: "", status: "idle", message: "Autosave ready" },
    lead: { id: "", status: "idle", message: "Autosave ready" },
    job: { id: "", status: "idle", message: "Autosave ready" },
  });
  const autosaveTimeoutsRef = useRef({ customer: null, lead: null, job: null });
  const autosaveVersionsRef = useRef({ customer: new Map(), lead: new Map(), job: new Map() });
  const pendingAutosavePatchesRef = useRef({ customer: new Map(), lead: new Map(), job: new Map() });
  const routeState = useMemo(() => parseAppPath(pathname), [pathname]);
  const active = routeState.active;

  function navigateTo(nextPath, { replace = false } = {}) {
    const normalized = normalizePathname(nextPath);
    if (window.location.pathname !== normalized) {
      if (replace) {
        window.history.replaceState({}, "", normalized);
      } else {
        window.history.pushState({}, "", normalized);
      }
    }
    setPathname(normalized);
  }

  function setActive(nextActive) {
    navigateTo(getModulePath(nextActive));
  }

  function navigateToLead(id) {
    setSelectedLeadId(id);
    navigateTo(buildLeadPath(id));
  }

  function navigateToJob(id) {
    setSelectedJobId(id);
    navigateTo(buildJobPath(id));
  }

  function navigateToCustomer(id) {
    setSelectedCustomerId(id);
    navigateTo(buildCustomerPath(id));
  }

  function applyBootstrap(nextState) {
    setAppState({
      user: nextState.user,
      users: nextState.users,
      customers: nextState.customers,
      leads: nextState.leads,
      leadStatusHistory: nextState.leadStatusHistory,
      jobs: nextState.jobs,
      queueItems: nextState.queueItems,
      activity: nextState.activity,
      auditEvents: nextState.auditEvents,
      permissions: nextState.permissions,
      stats: nextState.stats,
    });
  }

  function clearAutosaveTimer(kind) {
    if (autosaveTimeoutsRef.current[kind]) {
      window.clearTimeout(autosaveTimeoutsRef.current[kind]);
      autosaveTimeoutsRef.current[kind] = null;
    }
  }

  function setSaveState(kind, nextState) {
    setRecordSaveState((current) => ({
      ...current,
      [kind]: {
        ...current[kind],
        ...nextState,
      },
    }));
  }

  function bumpAutosaveVersion(kind, recordId) {
    const versions = autosaveVersionsRef.current[kind];
    const nextVersion = (versions.get(recordId) || 0) + 1;
    versions.set(recordId, nextVersion);
    return nextVersion;
  }

  function getAutosaveVersion(kind, recordId) {
    return autosaveVersionsRef.current[kind].get(recordId) || 0;
  }

  function mergeAutosaveResponse(kind, recordId, version, nextState) {
    setAppState((current) => {
      const currentVersion = getAutosaveVersion(kind, recordId);
      const shouldReplaceRecord = currentVersion === version;

      return {
        ...current,
        users: nextState.users,
        customers: kind === "customer" && !shouldReplaceRecord ? current.customers : nextState.customers,
        activity: nextState.activity,
        auditEvents: nextState.auditEvents,
        permissions: nextState.permissions,
        leads: kind === "lead" && !shouldReplaceRecord ? current.leads : nextState.leads,
        leadStatusHistory: nextState.leadStatusHistory,
        jobs: kind === "job" && !shouldReplaceRecord ? current.jobs : nextState.jobs,
        queueItems: nextState.queueItems,
        stats: nextState.stats,
      };
    });
  }

  function resetAutosaveState() {
    clearAutosaveTimer("customer");
    clearAutosaveTimer("lead");
    clearAutosaveTimer("job");
    autosaveVersionsRef.current.customer.clear();
    autosaveVersionsRef.current.lead.clear();
    autosaveVersionsRef.current.job.clear();
    pendingAutosavePatchesRef.current.customer.clear();
    pendingAutosavePatchesRef.current.lead.clear();
    pendingAutosavePatchesRef.current.job.clear();
    setRecordSaveState({
      customer: { id: "", status: "idle", message: "Autosave ready" },
      lead: { id: "", status: "idle", message: "Autosave ready" },
      job: { id: "", status: "idle", message: "Autosave ready" },
    });
  }

  function resetRecordAutosave(kind, recordId) {
    clearAutosaveTimer(kind);
    autosaveVersionsRef.current[kind].delete(recordId);
    pendingAutosavePatchesRef.current[kind].delete(recordId);
    setSaveState(kind, {
      id: recordId,
      status: "idle",
      message: "Autosave ready",
    });
  }

  function clearSession() {
    resetAutosaveState();
    window.localStorage.removeItem(SESSION_TOKEN_KEY);
    setSessionToken("");
    setAuthStatus("loggedOut");
    setAppState(EMPTY_APP_STATE);
    setSelectedCustomerId("");
    setSelectedLeadId("");
    setSelectedJobId("");
  }

  useEffect(() => () => {
    clearAutosaveTimer("customer");
    clearAutosaveTimer("lead");
    clearAutosaveTimer("job");
  }, []);

  useEffect(() => {
    function handlePopState() {
      setPathname(normalizePathname(window.location.pathname));
    }

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadPublicStatus() {
      try {
        await getHealth();
        if (cancelled) return;
        setBackendStatus("online");

        const nextSetupStatus = await getSetupStatus();
        if (cancelled) return;
        setSetupStatus({
          checked: true,
          needsSetup: nextSetupStatus.needsSetup,
          hasUsers: nextSetupStatus.hasUsers,
          demoMode: nextSetupStatus.demoMode,
          demoUserExists: nextSetupStatus.demoUserExists,
          environmentBootstrap: nextSetupStatus.environmentBootstrap,
        });
      } catch {
        if (!cancelled) {
          setBackendStatus("offline");
          setSetupStatus((current) => ({ ...current, checked: true }));
        }
      }
    }

    loadPublicStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!setupStatus.demoUserExists) return;
    if (credentials.email || credentials.password) return;
    setCredentials({
      email: "ops@lastyard.test",
      password: "concrete123",
    });
  }, [credentials.email, credentials.password, setupStatus.demoUserExists]);

  useEffect(() => {
    if (!appState.user?.id) return;
    setLeadDraft((current) => (current.ownerId ? current : { ...current, ownerId: appState.user.id, owner: appState.user.name }));
  }, [appState.user]);

  async function bootstrap(token) {
    setBusy(true);
    try {
      const data = await getBootstrap(token);
      applyBootstrap(data);
      setAuthStatus("authenticated");
      setErrorMessage("");
    } catch (error) {
      if (error.status === 401) {
        clearSession();
      } else {
        setErrorMessage(error.message);
      }
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!sessionToken) return;
    bootstrap(sessionToken);
  }, [sessionToken]);

  useEffect(() => {
    if (authStatus !== "authenticated") return;

    const fallbackCustomerId = appState.customers[0]?.id || "";

    if (routeState.customerId) {
      if (selectedCustomerId !== routeState.customerId) {
        setSelectedCustomerId(routeState.customerId);
      }
      return;
    }

    if (!selectedCustomerId && fallbackCustomerId) setSelectedCustomerId(fallbackCustomerId);
    if (selectedCustomerId && !appState.customers.some((customer) => customer.id === selectedCustomerId)) setSelectedCustomerId(fallbackCustomerId);
  }, [appState.customers, authStatus, routeState.customerId, selectedCustomerId]);

  useEffect(() => {
    if (authStatus !== "authenticated") return;

    const fallbackLeadId = appState.leads[0]?.id || "";

    if (routeState.leadId) {
      if (!appState.leads.some((lead) => lead.id === routeState.leadId)) {
        setSelectedLeadId(fallbackLeadId);
        navigateTo(getModulePath("leads"), { replace: true });
        return;
      }

      if (selectedLeadId !== routeState.leadId) {
        setSelectedLeadId(routeState.leadId);
      }
      return;
    }

    if (!selectedLeadId && fallbackLeadId) setSelectedLeadId(fallbackLeadId);
    if (selectedLeadId && !appState.leads.some((lead) => lead.id === selectedLeadId)) setSelectedLeadId(fallbackLeadId);
  }, [appState.leads, authStatus, routeState.leadId, selectedLeadId]);

  useEffect(() => {
    if (authStatus !== "authenticated") return;

    const fallbackJobId = appState.jobs[0]?.id || "";

    if (routeState.jobId) {
      if (!appState.jobs.some((job) => job.id === routeState.jobId)) {
        setSelectedJobId(fallbackJobId);
        navigateTo(getModulePath("jobs"), { replace: true });
        return;
      }

      if (selectedJobId !== routeState.jobId) {
        setSelectedJobId(routeState.jobId);
      }
      return;
    }

    if (!selectedJobId && fallbackJobId) setSelectedJobId(fallbackJobId);
    if (selectedJobId && !appState.jobs.some((job) => job.id === selectedJobId)) setSelectedJobId(fallbackJobId);
  }, [appState.jobs, authStatus, routeState.jobId, selectedJobId]);

  const selectedCustomer = appState.customers.find((customer) => customer.id === selectedCustomerId) || null;
  const selectedLead = appState.leads.find((lead) => lead.id === selectedLeadId) || null;
  const selectedJob = appState.jobs.find((job) => job.id === selectedJobId) || null;
  const customerSaveState = recordSaveState.customer.id === selectedCustomerId ? recordSaveState.customer : { id: selectedCustomerId, status: "idle", message: "Autosave ready" };
  const leadSaveState = recordSaveState.lead.id === selectedLeadId ? recordSaveState.lead : { id: selectedLeadId, status: "idle", message: "Autosave ready" };
  const jobSaveState = recordSaveState.job.id === selectedJobId ? recordSaveState.job : { id: selectedJobId, status: "idle", message: "Autosave ready" };

  const visibleCustomers = useMemo(() => filterCustomers(appState.customers, {
    status: customerFilter,
    query: customerSearch,
  }), [appState.customers, customerFilter, customerSearch]);

  const leadListState = useMemo(() => deriveLeadListState(appState.leads, {
    status: leadFilter,
    query: leadSearch,
    owner: leadOwnerFilter,
    source: leadSourceFilter,
    due: leadDueFilter,
  }), [appState.leads, leadDueFilter, leadFilter, leadOwnerFilter, leadSearch, leadSourceFilter]);
  const visibleLeads = leadListState.filteredLeads;

  const visibleJobs = useMemo(() => {
    const query = jobSearch.toLowerCase();
    return appState.jobs.filter((job) => {
      const matchesArchive = jobFilter === "Archived" ? Boolean(job.archivedAt) : !job.archivedAt;
      const matchesFilter = jobFilter === "All" || jobFilter === "Archived" ? true : job.stage === jobFilter;
      const matchesSearch = [job.job, job.customer, job.crew, job.next].some((value) => value.toLowerCase().includes(query));
      return matchesArchive && matchesFilter && matchesSearch;
    });
  }, [appState.jobs, jobFilter, jobSearch]);

  const stats = useMemo(() => {
    const liveLeads = appState.leads.filter((lead) => !lead.archivedAt);
    const liveJobs = appState.jobs.filter((job) => !job.archivedAt);
    const liveQueueItems = appState.queueItems.filter((item) => !item.archivedAt);
    const newLeads = liveLeads.filter((lead) => lead.status === "New").length;
    const highPriorityLeads = liveLeads.filter((lead) => lead.priority === "High").length;
    const pipelineValue = liveLeads.reduce((sum, lead) => sum + Number(lead.value || 0), 0);
    const activeJobs = liveJobs.filter((job) => job.stage === "In Progress").length;
    const scheduledJobs = liveJobs.filter((job) => job.stage === "Scheduled").length;
    const reportsDue = liveQueueItems.filter((item) => !item.done && item.status === "Due today").length;
    const queueBlocked = liveQueueItems.filter((item) => !item.done && item.status === "Blocked").length;
    return {
      newLeads,
      highPriorityLeads,
      pipelineValue,
      activeJobs,
      scheduledJobs,
      reportsDue,
      queueBlocked,
    };
  }, [appState.jobs, appState.leads, appState.queueItems]);

  const saveSummary = useMemo(() => {
    const relevantStates = [recordSaveState.customer, recordSaveState.lead, recordSaveState.job];
    if (relevantStates.some((item) => item.status === "error")) return { tone: "red", label: "Save error" };
    if (relevantStates.some((item) => item.status === "saving")) return { tone: "blue", label: "Saving changes" };
    if (relevantStates.some((item) => item.status === "pending")) return { tone: "amber", label: "Unsaved changes" };
    if (relevantStates.some((item) => item.status === "saved")) return { tone: "green", label: "All changes saved" };
    return null;
  }, [recordSaveState.customer, recordSaveState.job, recordSaveState.lead]);

  const counts = {
    customers: appState.permissions.customers.canView ? appState.customers.filter((customer) => !customer.archivedAt).length : null,
    leads: appState.leads.filter((lead) => !lead.archivedAt).length,
    jobs: appState.jobs.filter((job) => !job.archivedAt).length,
    reports: stats.reportsDue || null,
    copilot: 1,
  };

  async function runMutation(task) {
    if (!sessionToken) return;
    setBusy(true);
    try {
      const nextState = await task();
      if (nextState) applyBootstrap(nextState);
      setErrorMessage("");
    } catch (error) {
      if (error.status === 401) {
        clearSession();
      } else {
        setErrorMessage(error.message);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    setBusy(true);
    setLoginError("");
    try {
      const result = await login(credentials);
      setBackendStatus("online");
      window.localStorage.setItem(SESSION_TOKEN_KEY, result.token);
      setSessionToken(result.token);
      setAuthStatus("checking");
    } catch (error) {
      if (error.code === "BACKEND_UNAVAILABLE" || error.status === 0) {
        setBackendStatus("offline");
      }
      setLoginError(error.message);
      setBusy(false);
    }
  }

  async function handleBootstrapAdmin(event) {
    event.preventDefault();
    setBusy(true);
    setLoginError("");

    try {
      const result = await bootstrapAdminAccount(setupDraft);
      setBackendStatus("online");
      setSetupStatus({
        checked: true,
        needsSetup: false,
        hasUsers: true,
        demoMode: setupStatus.demoMode,
        demoUserExists: false,
        environmentBootstrap: false,
      });
      applyBootstrap(result);
      window.localStorage.setItem(SESSION_TOKEN_KEY, result.token);
      setSessionToken(result.token);
      setAuthStatus("authenticated");
      setSetupDraft(INITIAL_SETUP_FORM);
      setLoginError("");
    } catch (error) {
      if (error.code === "BACKEND_UNAVAILABLE" || error.status === 0) {
        setBackendStatus("offline");
      }
      setLoginError(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    if (sessionToken) {
      try {
        await logout(sessionToken);
      } catch {
        // Ignore logout failures; local cleanup still matters.
      }
    }
    clearSession();
  }

  function scheduleRecordSave(kind, recordId, patch) {
    if (!sessionToken) return;

    const version = bumpAutosaveVersion(kind, recordId);
    const pendingPatches = pendingAutosavePatchesRef.current[kind];
    pendingPatches.set(recordId, {
      ...(pendingPatches.get(recordId) || {}),
      ...patch,
    });
    clearAutosaveTimer(kind);
    setSaveState(kind, {
      id: recordId,
      status: "pending",
      message: "Changes pending",
    });

    autosaveTimeoutsRef.current[kind] = window.setTimeout(async () => {
      const pendingPatch = pendingAutosavePatchesRef.current[kind].get(recordId);
      if (!pendingPatch) return;

      setSaveState(kind, {
        id: recordId,
        status: "saving",
        message: "Saving...",
      });

      try {
        const nextState = kind === "customer"
          ? await updateCustomer(sessionToken, recordId, pendingPatch)
          : kind === "lead"
            ? await updateLead(sessionToken, recordId, pendingPatch)
            : await updateJob(sessionToken, recordId, pendingPatch);

        setErrorMessage("");
        mergeAutosaveResponse(kind, recordId, version, nextState);

        if (getAutosaveVersion(kind, recordId) === version) {
          pendingAutosavePatchesRef.current[kind].delete(recordId);
          setSaveState(kind, {
            id: recordId,
            status: "saved",
            message: "All changes saved",
          });
        }
      } catch (error) {
        if (error.status === 401) {
          clearSession();
          return;
        }

        setErrorMessage(error.message);
        if (getAutosaveVersion(kind, recordId) === version) {
          setSaveState(kind, {
            id: recordId,
            status: "error",
            message: error.message,
          });
        }
      }
    }, AUTOSAVE_DELAY_MS);
  }

  function handleLeadFieldChange(field, value) {
    if (!selectedLead || !appState.permissions.leads.canManage) return;
    const nextOwner = field === "ownerId" ? appState.users.find((user) => user.id === value) : null;
    const nextCustomer = field === "customerId" ? appState.customers.find((customer) => customer.id === value) : null;
    setAppState((current) => ({
      ...current,
      leads: current.leads.map((lead) => (lead.id === selectedLead.id ? {
        ...lead,
        [field]: value,
        ...(field === "ownerId" ? { owner: nextOwner?.name || lead.owner } : {}),
        ...(field === "customerId" && nextCustomer ? { customer: nextCustomer.name, city: nextCustomer.city || lead.city } : {}),
      } : lead)),
    }));
    scheduleRecordSave("lead", selectedLead.id, { [field]: value });
  }

  function handleCustomerFieldChange(field, value) {
    if (!selectedCustomer || !appState.permissions.customers.canManage) return;
    setAppState((current) => ({
      ...current,
      customers: current.customers.map((customer) => (customer.id === selectedCustomer.id ? { ...customer, [field]: value } : customer)),
    }));
    scheduleRecordSave("customer", selectedCustomer.id, { [field]: value });
  }

  function handleJobFieldChange(field, value) {
    if (!selectedJob) return;
    setAppState((current) => ({
      ...current,
      jobs: current.jobs.map((job) => (job.id === selectedJob.id ? { ...job, [field]: value } : job)),
    }));
    scheduleRecordSave("job", selectedJob.id, { [field]: value });
  }

  function handleCreateLead(event) {
    event.preventDefault();
    if (!appState.permissions.leads.canManage) return;
    const existingLeadIds = new Set(appState.leads.map((lead) => lead.id));
    runMutation(async () => {
      const nextState = await createLead(sessionToken, leadDraft);
      const createdLead = nextState.leads.find((lead) => !existingLeadIds.has(lead.id));
      if (createdLead) {
        navigateToLead(createdLead.id);
      }
      setLeadDraft({
        ...INITIAL_LEAD_FORM,
        ownerId: appState.user?.id || "",
        owner: appState.user?.name || "",
      });
      return nextState;
    });
  }

  function handleCreateCustomer(event) {
    event.preventDefault();
    const existingCustomerIds = new Set(appState.customers.map((customer) => customer.id));
    runMutation(async () => {
      const nextState = await createCustomer(sessionToken, customerDraft);
      const createdCustomer = nextState.customers.find((customer) => !existingCustomerIds.has(customer.id));
      if (createdCustomer) {
        navigateToCustomer(createdCustomer.id);
      }
      setCustomerDraft(INITIAL_CUSTOMER_FORM);
      return nextState;
    });
  }

  function handleCreateJob(event) {
    event.preventDefault();
    const existingJobIds = new Set(appState.jobs.map((job) => job.id));
    runMutation(async () => {
      const nextState = await createJob(sessionToken, jobDraft);
      const createdJob = nextState.jobs.find((job) => !existingJobIds.has(job.id));
      if (createdJob) {
        navigateToJob(createdJob.id);
      }
      setJobDraft(INITIAL_JOB_FORM);
      return nextState;
    });
  }

  function handleCreateJobFromLead() {
    if (!selectedLead || !appState.permissions.leads.canManage) return;
    const existingJobIds = new Set(appState.jobs.map((job) => job.id));
    runMutation(async () => {
      const nextState = await convertLead(sessionToken, selectedLead.id);
      const createdJob = nextState.jobs.find((job) => !existingJobIds.has(job.id));
      if (createdJob) {
        navigateToJob(createdJob.id);
      } else {
        setActive("jobs");
      }
      return nextState;
    });
  }

  function handleConvertLeadToCustomer() {
    if (!selectedLead || !appState.permissions.leads.canManage) return;
    runMutation(() => convertLeadToCustomer(sessionToken, selectedLead.id));
  }

  function handleAddTask(event) {
    event.preventDefault();
    runMutation(async () => {
      const nextState = await createQueueItem(sessionToken, taskDraft);
      setTaskDraft(INITIAL_TASK_FORM);
      return nextState;
    });
  }

  function handleToggleTask(taskId) {
    runMutation(() => toggleQueueItem(sessionToken, taskId));
  }

  function handleArchiveLead() {
    if (!selectedLead || !appState.permissions.leads.canManage) return;
    resetRecordAutosave("lead", selectedLead.id);
    runMutation(() => archiveLead(sessionToken, selectedLead.id));
  }

  function handleArchiveCustomer() {
    if (!selectedCustomer) return;
    resetRecordAutosave("customer", selectedCustomer.id);
    runMutation(() => archiveCustomer(sessionToken, selectedCustomer.id));
  }

  function handleRestoreCustomer() {
    if (!selectedCustomer) return;
    resetRecordAutosave("customer", selectedCustomer.id);
    runMutation(() => restoreCustomer(sessionToken, selectedCustomer.id));
  }

  function handleRestoreLead() {
    if (!selectedLead || !appState.permissions.leads.canManage) return;
    resetRecordAutosave("lead", selectedLead.id);
    runMutation(() => restoreLead(sessionToken, selectedLead.id));
  }

  function handleDeleteLead() {
    if (!selectedLead || !appState.permissions.leads.canManage || !window.confirm(`Delete ${selectedLead.customer} permanently? This cannot be undone.`)) return;
    resetRecordAutosave("lead", selectedLead.id);
    runMutation(() => deleteLead(sessionToken, selectedLead.id));
  }

  function handleArchiveJob() {
    if (!selectedJob) return;
    resetRecordAutosave("job", selectedJob.id);
    runMutation(() => archiveJob(sessionToken, selectedJob.id));
  }

  function handleRestoreJob() {
    if (!selectedJob) return;
    resetRecordAutosave("job", selectedJob.id);
    runMutation(() => restoreJob(sessionToken, selectedJob.id));
  }

  function handleDeleteJob() {
    if (!selectedJob || !window.confirm(`Delete ${selectedJob.job} permanently? This cannot be undone.`)) return;
    resetRecordAutosave("job", selectedJob.id);
    runMutation(() => deleteJob(sessionToken, selectedJob.id));
  }

  function handleArchiveTask(taskId) {
    runMutation(() => archiveQueueItem(sessionToken, taskId));
  }

  function handleRestoreTask(taskId) {
    runMutation(() => restoreQueueItem(sessionToken, taskId));
  }

  function handleDeleteTask(taskId) {
    const task = appState.queueItems.find((item) => item.id === taskId);
    if (!task || !window.confirm(`Delete "${task.title}" permanently? This cannot be undone.`)) return;
    runMutation(() => deleteQueueItem(sessionToken, taskId));
  }

  function handleReset() {
    if (!window.confirm("Reset the workspace to the seeded demo data?")) return;
    runMutation(() => resetWorkspace(sessionToken));
  }

  if (authStatus === "checking") {
    return <LoadingScreen label="Loading authenticated workspace..." />;
  }

  if (authStatus === "loggedOut") {
    return (
      <LoginScreen
        credentials={credentials}
        setCredentials={setCredentials}
        onSubmit={handleLogin}
        loading={busy}
        error={loginError}
        backendStatus={backendStatus}
        setupStatus={setupStatus}
        setupDraft={setupDraft}
        setSetupDraft={setSetupDraft}
        onSetupSubmit={handleBootstrapAdmin}
      />
    );
  }

  const mobileItems = ["dashboard", "leads", "jobs", "calculator", "design"];
  const allItems = NAV_GROUPS.flatMap((group) => group.items);
  const customerRelated = relatedCustomerRecords(selectedCustomer, appState.leads, appState.jobs, appState.activity);
  const leadRelated = relatedLeadActivity(selectedLead, appState.customers, appState.activity, appState.leadStatusHistory);

  return (
    <div className="min-h-screen bg-transparent text-slate-950">
      <div className="flex">
        <Sidebar active={active} setActive={setActive} counts={counts} />
        <div className="min-w-0 flex-1 pb-20 lg:pb-0">
          <TopBar active={active} setActive={setActive} stats={stats} user={appState.user} onLogout={handleLogout} syncing={busy || saveSummary?.label === "Saving changes"} saveSummary={saveSummary} />
          <ErrorBanner message={errorMessage} onDismiss={() => setErrorMessage("")} />
          <main className="py-0">
            <MainContent
              active={active}
              setActive={setActive}
              user={appState.user}
              stats={stats}
              customers={appState.customers}
              leads={appState.leads}
              jobs={appState.jobs}
              queueItems={appState.queueItems}
              activity={appState.activity}
              auditEvents={appState.auditEvents}
              demoMode={setupStatus.demoMode}
              permissions={appState.permissions}
              users={appState.users}
              customerFilter={customerFilter}
              setCustomerFilter={setCustomerFilter}
              customerSearch={customerSearch}
              setCustomerSearch={setCustomerSearch}
              selectedCustomerId={selectedCustomerId}
              onSelectCustomer={navigateToCustomer}
              selectedCustomer={selectedCustomer}
              onCustomerFieldChange={handleCustomerFieldChange}
              customerSaveState={customerSaveState}
              customerDraft={customerDraft}
              setCustomerDraft={setCustomerDraft}
              onCreateCustomer={handleCreateCustomer}
              onArchiveCustomer={handleArchiveCustomer}
              onRestoreCustomer={handleRestoreCustomer}
              relatedRecords={customerRelated}
              customerRouteRequested={Boolean(routeState.customerId)}
              leadFilter={leadFilter}
              setLeadFilter={setLeadFilter}
              leadSearch={leadSearch}
              setLeadSearch={setLeadSearch}
              leadOwnerFilter={leadOwnerFilter}
              setLeadOwnerFilter={setLeadOwnerFilter}
              leadSourceFilter={leadSourceFilter}
              setLeadSourceFilter={setLeadSourceFilter}
              leadDueFilter={leadDueFilter}
              setLeadDueFilter={setLeadDueFilter}
              jobFilter={jobFilter}
              setJobFilter={setJobFilter}
              jobSearch={jobSearch}
              setJobSearch={setJobSearch}
              selectedLeadId={selectedLeadId}
              onSelectLead={navigateToLead}
              selectedLead={selectedLead}
              onLeadFieldChange={handleLeadFieldChange}
              leadSaveState={leadSaveState}
              onArchiveLead={handleArchiveLead}
              onRestoreLead={handleRestoreLead}
              onDeleteLead={handleDeleteLead}
              onConvertLeadToCustomer={handleConvertLeadToCustomer}
              relatedLeadRecords={leadRelated}
              leadDraft={leadDraft}
              setLeadDraft={setLeadDraft}
              onCreateLead={handleCreateLead}
              onCreateJobFromLead={handleCreateJobFromLead}
              selectedJobId={selectedJobId}
              onSelectJob={navigateToJob}
              selectedJob={selectedJob}
              onJobFieldChange={handleJobFieldChange}
              jobSaveState={jobSaveState}
              onArchiveJob={handleArchiveJob}
              onRestoreJob={handleRestoreJob}
              onDeleteJob={handleDeleteJob}
              jobDraft={jobDraft}
              setJobDraft={setJobDraft}
              onCreateJob={handleCreateJob}
              taskDraft={taskDraft}
              setTaskDraft={setTaskDraft}
              onAddTask={handleAddTask}
              onToggleTask={handleToggleTask}
              onArchiveTask={handleArchiveTask}
              onRestoreTask={handleRestoreTask}
              onDeleteTask={handleDeleteTask}
              visibleCustomers={visibleCustomers}
              visibleLeads={visibleLeads}
              visibleJobs={visibleJobs}
              onReset={handleReset}
              busy={busy}
            />
          </main>
        </div>
      </div>
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-blue-100 bg-white/95 px-2 py-2 backdrop-blur lg:hidden">
        <div className="grid grid-cols-5 gap-1">
          {mobileItems.map((id) => {
            const item = allItems.find((nav) => nav.id === id);
            const isActive = active === id;
            return (
              <button key={id} type="button" onClick={() => setActive(id)} className={`rounded-2xl px-1.5 py-2 text-[11px] font-black ${isActive ? "bg-blue-700 text-white" : "text-slate-500"}`}>
                <Icon name={item?.icon || "grid"} className="mx-auto h-4 w-4" />
                <span className="mt-1 block truncate">{item?.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
