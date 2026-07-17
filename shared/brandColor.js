// ---------------------------------------------------------------------------
// Company brand color: storage + delivery helpers.
//
// A company can pick ANY brand color (a free hex), not just the 5 named accent
// presets. The picked color drives the estimate PDF's accent. This module is the
// single source of truth for validating that hex, mapping the named presets to
// hex, and DERIVING the dark/soft accent variants -- shared by the settings
// validator (server/index.js), the storage normalizer (server/store.js), the PDF
// accent seam (server/estimate-pdf.js), and the settings color picker (src/App.jsx)
// so none of them can drift.
//
// Contrast (white vs dark text on the color) is intentionally NOT decided here --
// the estimate redesign owns readability. This module only stores + delivers the
// hex cleanly, plus a derived dark/soft pair.
// ---------------------------------------------------------------------------

// Hex for the 5 named accent presets. These mirror the Tailwind classes the web
// UI uses in BRANDING_ACCENT_OPTIONS (blue-700, slate-700, emerald-600,
// amber-500, orange-500) so clicking a preset drives the PDF the same way a
// custom pick does.
export const ACCENT_PRESET_HEX = {
  blue: "#1d4ed8",
  slate: "#334155",
  emerald: "#059669",
  amber: "#f59e0b",
  orange: "#f97316",
};

export const DEFAULT_BRAND_HEX = ACCENT_PRESET_HEX.blue;

// Validate + normalize a user-supplied brand color. Accepts #RGB or #RRGGBB in
// any case; returns a canonical lowercase #rrggbb, or "" if it isn't a real hex.
export function normalizeBrandColorHex(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(trimmed);
  if (short) {
    return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`.toLowerCase();
  }
  if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed.toLowerCase();
  return "";
}

function clampChannel(n) {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function hexToRgb(hex) {
  const normalized = normalizeBrandColorHex(hex);
  if (!normalized) return null;
  return {
    r: parseInt(normalized.slice(1, 3), 16),
    g: parseInt(normalized.slice(3, 5), 16),
    b: parseInt(normalized.slice(5, 7), 16),
  };
}

function rgbToHex({ r, g, b }) {
  const to2 = (v) => clampChannel(v).toString(16).padStart(2, "0");
  return `#${to2(r)}${to2(g)}${to2(b)}`;
}

function mixToward(hex, target, weight) {
  const base = hexToRgb(hex);
  if (!base) return "";
  return rgbToHex({
    r: base.r + (target.r - base.r) * weight,
    g: base.g + (target.g - base.g) * weight,
    b: base.b + (target.b - base.b) * weight,
  });
}

const BLACK = { r: 0, g: 0, b: 0 };
const WHITE = { r: 255, g: 255, b: 255 };

// Derive the dark + soft accent variants from a base brand color, purely by
// mixing toward black/white so ANY picked color yields a usable pair. Returns
// null for an invalid hex.
export function deriveBrandAccentColors(value) {
  const base = normalizeBrandColorHex(value);
  if (!base) return null;
  return {
    accentColor: base,
    accentDarkColor: mixToward(base, BLACK, 0.26),
    accentSoftColor: mixToward(base, WHITE, 0.9),
  };
}

// Resolve a company's effective brand hex: an explicit custom brandColorHex wins,
// else the named accentColor preset, else the default blue. Always returns a hex.
export function resolveCompanyBrandHex(companyProfile = {}) {
  const custom = normalizeBrandColorHex(companyProfile.brandColorHex);
  if (custom) return custom;
  const presetName = String(companyProfile.accentColor || "").trim().toLowerCase();
  // Own-property guard so an adversarial accentColor ("constructor", "__proto__", ...)
  // can never resolve to a prototype member instead of a real hex.
  return Object.prototype.hasOwnProperty.call(ACCENT_PRESET_HEX, presetName)
    ? ACCENT_PRESET_HEX[presetName]
    : DEFAULT_BRAND_HEX;
}
