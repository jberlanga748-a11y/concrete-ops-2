export const APP_NAME = "Apex HQ";
export const DEFAULT_COMPANY_NAME = "Apex HQ Workspace";
export const DEMO_COMPANY_NAME = "Apex HQ Demo Company";
export const DEFAULT_LOGO_INITIALS = "AH";
export const APEX_BRAND_ASSETS = {
  loginLogo: "/brand/apex-login-logo.png",
  loginIcon: "/brand/apex-login-icon.png",
  appLogo: "/brand/apex-app-logo.png",
  appWordmark: "/brand/apex-app-wordmark.png",
  wordmarkTransparent: "/brand/apex-wordmark-transparent.png",
  appMark: "/brand/apex-app-mark.png",
  appIcon: "/brand/apex-app-icon.png",
  splash: "/brand/apex-splash.png",
};
export const BRANDING_ACCENT_OPTIONS = [
  { value: "blue", label: "Blue", swatchClassName: "bg-blue-700", buttonClassName: "bg-blue-700 text-white shadow-sm shadow-blue-700/20", badgeClassName: "bg-blue-50 text-blue-700 ring-blue-100", previewClassName: "bg-blue-700 text-white" },
  { value: "slate", label: "Slate", swatchClassName: "bg-slate-700", buttonClassName: "bg-slate-700 text-white shadow-sm shadow-slate-700/20", badgeClassName: "bg-slate-100 text-slate-700 ring-slate-200", previewClassName: "bg-slate-700 text-white" },
  { value: "emerald", label: "Emerald", swatchClassName: "bg-emerald-600", buttonClassName: "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20", badgeClassName: "bg-emerald-50 text-emerald-700 ring-emerald-100", previewClassName: "bg-emerald-600 text-white" },
  { value: "amber", label: "Amber", swatchClassName: "bg-amber-500", buttonClassName: "bg-amber-500 text-white shadow-sm shadow-amber-500/20", badgeClassName: "bg-amber-50 text-amber-700 ring-amber-100", previewClassName: "bg-amber-500 text-white" },
  { value: "orange", label: "Orange", swatchClassName: "bg-orange-500", buttonClassName: "bg-orange-500 text-white shadow-sm shadow-orange-500/20", badgeClassName: "bg-orange-50 text-orange-700 ring-orange-100", previewClassName: "bg-orange-500 text-white" },
];

function legacyBrandPhrase(...parts) {
  return parts.join(" ");
}

export function sanitizeLogoInitials(value) {
  return String(value ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3);
}

export function normalizeVisibleBrandName(value) {
  const trimmed = String(value ?? "").trim();
  const legacyBrandNames = new Map([
    [legacyBrandPhrase("Concrete", "Ops"), APP_NAME],
    [legacyBrandPhrase("Concrete", "Ops", "2"), APP_NAME],
    [legacyBrandPhrase("Concrete", "Ops", "Workspace"), DEFAULT_COMPANY_NAME],
    [legacyBrandPhrase("Concrete", "Ops", "Demo", "Company"), DEMO_COMPANY_NAME],
  ]);
  return legacyBrandNames.get(trimmed) || trimmed;
}

export function deriveLogoInitialsFromCompanyName(companyName) {
  const words = String(companyName ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return words.slice(0, 2).map((word) => word[0]).join("").toUpperCase();
  }
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return "";
}

export function resolveWorkspaceLogoInitials({ companySettings, companyName } = {}) {
  const explicitLogoInitials = sanitizeLogoInitials(companySettings?.logoInitials);
  if (explicitLogoInitials) {
    const normalizedCompanyName = normalizeVisibleBrandName(companyName || companySettings?.companyName);
    if (explicitLogoInitials === "CO" && [APP_NAME, DEFAULT_COMPANY_NAME, DEMO_COMPANY_NAME].includes(normalizedCompanyName)) {
      return DEFAULT_LOGO_INITIALS;
    }
    return explicitLogoInitials;
  }

  const derivedInitials = sanitizeLogoInitials(deriveLogoInitialsFromCompanyName(companyName));
  return derivedInitials || DEFAULT_LOGO_INITIALS;
}

export function resolveWorkspaceCompanyName({ currentCompany, companySettings, user, demoMode } = {}) {
  const explicitCompanyName = [currentCompany?.name, companySettings?.companyName, user?.companyName]
    .find((value) => typeof value === "string" && value.trim());

  if (explicitCompanyName) return normalizeVisibleBrandName(explicitCompanyName);
  return demoMode ? DEMO_COMPANY_NAME : DEFAULT_COMPANY_NAME;
}

export function normalizeAccentColor(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return BRANDING_ACCENT_OPTIONS.some((option) => option.value === normalized) ? normalized : "blue";
}

export function getAccentTheme(accentColor) {
  return BRANDING_ACCENT_OPTIONS.find((option) => option.value === normalizeAccentColor(accentColor)) || BRANDING_ACCENT_OPTIONS[0];
}
