export const APP_NAME = "Apex HQ";
export const DEFAULT_COMPANY_NAME = "Apex HQ Workspace";
export const DEMO_COMPANY_NAME = "Apex HQ Demo Company";
export const DEFAULT_LOGO_INITIALS = "AH";

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
