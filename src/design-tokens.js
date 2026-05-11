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
  control: "0.875rem",
  card: "1.25rem",
  panel: "1.5rem",
  shell: "1.75rem",
  pill: "999px",
};

export const DESIGN_SHADOWS = {
  card: "0 14px 34px -28px rgba(15, 23, 42, 0.42)",
  panel: "0 24px 60px -36px rgba(15, 23, 42, 0.38)",
  shell: "8px 0 34px -28px rgba(15, 23, 42, 0.72)",
  focus: "0 0 0 3px rgba(249, 115, 22, 0.22)",
};

export const DESIGN_SPACING = {
  pageX: "1.25rem",
  pageXWide: "2rem",
  cardPadding: "1.25rem",
  sectionGap: "1rem",
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
  primary: "bg-orange-600 text-white hover:bg-orange-700 shadow-sm shadow-orange-600/25 focus-visible:ring-orange-500",
  secondary: "border border-slate-200 bg-white text-slate-700 hover:border-orange-200 hover:bg-orange-50 hover:text-slate-950 focus-visible:ring-orange-500",
  ghost: "text-slate-600 hover:bg-orange-50 hover:text-orange-700 focus-visible:ring-orange-500",
  danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm shadow-red-600/20 focus-visible:ring-red-500",
  dark: "bg-slate-950 text-white hover:bg-slate-800 shadow-sm shadow-slate-900/20 focus-visible:ring-orange-500",
};

const STATUS_TONE_CLASSES = {
  blue: "bg-blue-50 text-blue-700 ring-blue-100",
  info: "bg-blue-50 text-blue-700 ring-blue-100",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  amber: "bg-amber-50 text-amber-700 ring-amber-100",
  warning: "bg-amber-50 text-amber-700 ring-amber-100",
  orange: "bg-orange-50 text-orange-700 ring-orange-100",
  red: "bg-red-50 text-red-700 ring-red-100",
  danger: "bg-red-50 text-red-700 ring-red-100",
  violet: "bg-violet-50 text-violet-700 ring-violet-100",
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  shell: "bg-slate-950 text-white ring-slate-800",
};

const CARD_VARIANT_CLASSES = {
  default: "panel-sheen co-card w-full min-w-0 max-w-full rounded-3xl border bg-white/95 shadow-panel",
  flat: "co-card w-full min-w-0 max-w-full rounded-3xl border bg-white",
  rail: "co-action-panel w-full min-w-0 max-w-full rounded-3xl border bg-white shadow-panel",
  shell: "co-sidebar-panel w-full min-w-0 max-w-full rounded-3xl border shadow-panel",
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
