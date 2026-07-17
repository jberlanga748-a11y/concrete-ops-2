import assert from "node:assert/strict";
import test from "node:test";

import {
  ACCENT_PRESET_HEX,
  DEFAULT_BRAND_HEX,
  normalizeBrandColorHex,
  deriveBrandAccentColors,
  resolveCompanyBrandHex,
} from "./brandColor.js";

test("normalizeBrandColorHex accepts #RGB and #RRGGBB, rejects junk", () => {
  assert.equal(normalizeBrandColorHex("#abc"), "#aabbcc");
  assert.equal(normalizeBrandColorHex("#2563EB"), "#2563eb");
  assert.equal(normalizeBrandColorHex("  #2563eb  "), "#2563eb");
  assert.equal(normalizeBrandColorHex("#F0A"), "#ff00aa");

  // Rejected: no hash, wrong length, non-hex chars, non-strings.
  assert.equal(normalizeBrandColorHex("2563eb"), "");
  assert.equal(normalizeBrandColorHex("#12"), "");
  assert.equal(normalizeBrandColorHex("#1234"), "");
  assert.equal(normalizeBrandColorHex("#12345g"), "");
  assert.equal(normalizeBrandColorHex("red"), "");
  assert.equal(normalizeBrandColorHex("rgb(1,2,3)"), "");
  assert.equal(normalizeBrandColorHex(""), "");
  assert.equal(normalizeBrandColorHex(null), "");
  assert.equal(normalizeBrandColorHex(0x2563eb), "");
});

test("deriveBrandAccentColors produces a dark + soft variant from the picked hex", () => {
  const brand = deriveBrandAccentColors("#3366cc");
  assert.equal(brand.accentColor, "#3366cc");
  assert.match(brand.accentDarkColor, /^#[0-9a-f]{6}$/);
  assert.match(brand.accentSoftColor, /^#[0-9a-f]{6}$/);
  // Dark and soft are genuinely different from the base and from each other.
  assert.notEqual(brand.accentDarkColor, brand.accentColor);
  assert.notEqual(brand.accentSoftColor, brand.accentColor);
  assert.notEqual(brand.accentDarkColor, brand.accentSoftColor);

  // Dark is darker (lower channel sum), soft is lighter (higher channel sum) than the base.
  const channelSum = (hex) => parseInt(hex.slice(1, 3), 16) + parseInt(hex.slice(3, 5), 16) + parseInt(hex.slice(5, 7), 16);
  assert.ok(channelSum(brand.accentDarkColor) < channelSum(brand.accentColor));
  assert.ok(channelSum(brand.accentSoftColor) > channelSum(brand.accentColor));

  // Works for a normalizable short hex too, and returns null for junk.
  assert.equal(deriveBrandAccentColors("#f0a").accentColor, "#ff00aa");
  assert.equal(deriveBrandAccentColors("nope"), null);
  assert.equal(deriveBrandAccentColors(""), null);
});

test("the 5 named presets each map to a hex and default to blue", () => {
  assert.deepEqual(Object.keys(ACCENT_PRESET_HEX).sort(), ["amber", "blue", "emerald", "orange", "slate"]);
  for (const hex of Object.values(ACCENT_PRESET_HEX)) {
    assert.match(hex, /^#[0-9a-f]{6}$/);
  }
  assert.equal(DEFAULT_BRAND_HEX, ACCENT_PRESET_HEX.blue);
});

test("resolveCompanyBrandHex: custom hex wins, else preset, else default", () => {
  // Custom brand color wins.
  assert.equal(resolveCompanyBrandHex({ brandColorHex: "#123456", accentColor: "orange" }), "#123456");
  assert.equal(resolveCompanyBrandHex({ brandColorHex: "#ABC" }), "#aabbcc");
  // No custom color -> the named preset drives it (so presets still reach the PDF).
  assert.equal(resolveCompanyBrandHex({ accentColor: "emerald" }), ACCENT_PRESET_HEX.emerald);
  assert.equal(resolveCompanyBrandHex({ accentColor: "orange" }), ACCENT_PRESET_HEX.orange);
  // Junk custom color is ignored and falls back to the preset.
  assert.equal(resolveCompanyBrandHex({ brandColorHex: "not-a-color", accentColor: "amber" }), ACCENT_PRESET_HEX.amber);
  // Nothing set -> default blue.
  assert.equal(resolveCompanyBrandHex({}), DEFAULT_BRAND_HEX);
  assert.equal(resolveCompanyBrandHex(), DEFAULT_BRAND_HEX);
  // Adversarial accentColor values must resolve to the default hex, never a prototype member.
  for (const evil of ["constructor", "__proto__", "hasOwnProperty", "toString"]) {
    const resolved = resolveCompanyBrandHex({ accentColor: evil });
    assert.equal(resolved, DEFAULT_BRAND_HEX);
    assert.match(resolved, /^#[0-9a-f]{6}$/);
  }
});
