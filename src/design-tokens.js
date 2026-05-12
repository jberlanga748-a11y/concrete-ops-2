export const DESIGN_COLORS = {
  brand: {
    orange: "#F97316",
    orangeStrong: "#FF5A00",
    orangeDark: "#C2410C",
    orangeSoft: "#FFF7ED",
  },
  shell: {
    dark: "#07111F",
    darkSoft: "#0F172A",
    darkMuted: "#1E293B",
    border: "#1F2A3A",
    text: "#F8FAFC",
    textMuted: "#CBD5E1",
  },
  workspace: {
    page: "#F8FAFC",
    panel: "#F1F5F9",
    card: "#FFFFFF",
    cardMuted: "#F8FAFC",
  },
  border: {
    subtle: "#E2E8F0",
    strong: "#CBD5E1",
    orange: "#FDBA74",
  },
  text: {
    main: "#0F172A",
    muted: "#64748B",
    soft: "#94A3B8",
    inverse: "#F8FAFC",
  },
  status: {
    info: "#2563EB",
    success: "#059669",
    warning: "#D97706",
    danger: "#DC2626",
    neutral: "#475569",
    violet: "#7C3AED",
  },
};

export const DESIGN_SEMANTIC_COLORS = {
  pageBackground: DESIGN_COLORS.workspace.page,
  shellBackground: DESIGN_COLORS.shell.dark,
  shellAccent: DESIGN_COLORS.brand.orange,
  cardBackground: DESIGN_COLORS.workspace.card,
  cardBorder: DESIGN_COLORS.border.subtle,
  focusRing: "rgba(249, 115, 22, 0.24)",
  tableRowHover: "#FFF7ED",
};

export const DESIGN_RADIUS = {
  control: "0.625rem",
  card: "0.75rem",
  panel: "0.875rem",
  shell: "1.75rem",
  pill: "999px",
};

export const DESIGN_SHADOWS = {
  card: "0 18px 45px -36px rgba(7, 17, 31, 0.5)",
  panel: "0 24px 54px -38px rgba(7, 17, 31, 0.56)",
  shell: "8px 0 34px -28px rgba(15, 23, 42, 0.72)",
  focus: "0 0 0 3px rgba(249, 115, 22, 0.22)",
};

export const DESIGN_SPACING = {
  pageX: "1.25rem",
  pageXWide: "2rem",
  cardPadding: "1rem",
  sectionGap: "0.875rem",
  controlGap: "0.5rem",
};

export const DESIGN_TYPOGRAPHY = {
  fontFamily: '"IBM Plex Sans", "Segoe UI", sans-serif',
  headingTracking: "-0.03em",
  eyebrowTracking: "0.18em",
  bodyLineHeight: "1.5",
};

export const DESIGN_LAYOUT = {
  sidebarWidth: "17rem",
  contentMaxWidth: "1520px",
  rightRailWidth: "22rem",
  topbarHeight: "4.5rem",
};

const BUTTON_TONE_CLASSES = {
  primary: "bg-orange-600 text-white shadow-sm shadow-orange-600/25 hover:bg-orange-700 hover:shadow-orange-700/25 focus-visible:ring-orange-500",
  secondary: "border border-slate-300 bg-white text-slate-950 shadow-sm shadow-slate-200/60 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 focus-visible:ring-orange-500",
  ghost: "text-slate-700 hover:bg-orange-50 hover:text-orange-700 focus-visible:ring-orange-500",
  danger: "bg-red-600 text-white shadow-sm shadow-red-600/20 hover:bg-red-700 focus-visible:ring-red-500",
  dark: "bg-slate-950 text-white shadow-sm shadow-slate-900/20 hover:bg-slate-800 focus-visible:ring-orange-500",
};

const STATUS_TONE_CLASSES = {
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  info: "bg-blue-50 text-blue-700 ring-blue-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  warning: "bg-amber-50 text-amber-700 ring-amber-200",
  orange: "bg-orange-50 text-orange-700 ring-orange-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  danger: "bg-red-50 text-red-700 ring-red-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
  slate: "bg-slate-100 text-slate-700 ring-slate-300",
  neutral: "bg-slate-100 text-slate-700 ring-slate-300",
  shell: "bg-slate-950 text-white ring-slate-800",
};

const CARD_VARIANT_CLASSES = {
  default: "panel-sheen co-card w-full min-w-0 max-w-full rounded-xl border bg-white/95",
  flat: "co-card w-full min-w-0 max-w-full rounded-xl border bg-white",
  rail: "co-action-panel w-full min-w-0 max-w-full rounded-xl border bg-white",
  shell: "co-sidebar-panel w-full min-w-0 max-w-full rounded-2xl border shadow-panel",
};

export const DESIGN_COMPONENTS = {
  button: BUTTON_TONE_CLASSES,
  badge: STATUS_TONE_CLASSES,
  card: CARD_VARIANT_CLASSES,
  shell: {
    app: "co-app-shell",
    workspace: "co-workspace-shell",
    sidebar: "co-sidebar-shell",
    topbar: "co-topbar",
    sidebarNavItem: "co-sidebar-nav-item",
    sidebarNavActive: "co-sidebar-nav-active",
    sidebarNavInactive: "co-sidebar-nav-inactive",
  },
  commandCenter: {
    page: "co-command-page",
    card: "co-command-card",
    kpi: "co-command-kpi",
    priorityRow: "co-command-priority-row",
    rightRail: "co-command-right-rail",
    actionRow: "co-command-action-row",
  },
  focusVisible: "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
};

export function getStatusToneClass(tone = "blue") {
  return STATUS_TONE_CLASSES[tone] || STATUS_TONE_CLASSES.blue;
}

export function getButtonToneClass(variant = "primary") {
  return BUTTON_TONE_CLASSES[variant] || BUTTON_TONE_CLASSES.primary;
}

export function getCardClass(variant = "default") {
  return CARD_VARIANT_CLASSES[variant] || CARD_VARIANT_CLASSES.default;
}
