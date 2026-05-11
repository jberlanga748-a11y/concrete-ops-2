import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  DESIGN_COLORS,
  DESIGN_COMPONENTS,
  DESIGN_LAYOUT,
  DESIGN_RADIUS,
  DESIGN_SEMANTIC_COLORS,
  DESIGN_SHADOWS,
  DESIGN_SPACING,
  DESIGN_TYPOGRAPHY,
  getButtonToneClass,
  getCardClass,
  getStatusToneClass,
} from "./design-tokens.js";

const repoRoot = process.cwd();

test("design tokens expose the Concrete Ops visual foundation", () => {
  assert.equal(DESIGN_COLORS.brand.orange, "#F97316");
  assert.equal(DESIGN_COLORS.shell.dark, "#07111F");
  assert.equal(DESIGN_COLORS.workspace.page, "#F8FAFC");
  assert.equal(DESIGN_COLORS.workspace.card, "#FFFFFF");
  assert.equal(DESIGN_SEMANTIC_COLORS.shellAccent, DESIGN_COLORS.brand.orange);
  assert.ok(DESIGN_RADIUS.card);
  assert.ok(DESIGN_RADIUS.control);
  assert.ok(DESIGN_SHADOWS.card);
  assert.ok(DESIGN_SHADOWS.panel);
  assert.ok(DESIGN_SPACING.cardPadding);
  assert.ok(DESIGN_TYPOGRAPHY.fontFamily.includes("IBM Plex Sans"));
  assert.ok(DESIGN_LAYOUT.sidebarWidth);
  assert.ok(DESIGN_COMPONENTS.button.primary.includes("orange"));
  assert.equal(DESIGN_COMPONENTS.shell.sidebar, "co-sidebar-shell");
  assert.equal(DESIGN_COMPONENTS.shell.topbar, "co-topbar");
});

test("design token helpers return safe class strings with fallbacks", () => {
  assert.match(getStatusToneClass("green"), /emerald/);
  assert.match(getStatusToneClass("unknown-tone"), /blue/);
  assert.match(getButtonToneClass("primary"), /orange/);
  assert.match(getButtonToneClass("unknown-variant"), /orange/);
  assert.match(getCardClass("default"), /co-card/);
  assert.match(getCardClass("unknown-card"), /co-card/);
});

test("main css defines reusable design variables and foundation classes", () => {
  const css = fs.readFileSync(path.join(repoRoot, "src", "index.css"), "utf8");

  assert.match(css, /--color-brand-orange:\s*#F97316/);
  assert.match(css, /--color-shell-dark:\s*#07111F/);
  assert.match(css, /--color-workspace:\s*#F8FAFC/);
  assert.match(css, /--color-topbar:/);
  assert.match(css, /--color-card:\s*#FFFFFF/);
  assert.match(css, /--shadow-card:/);
  assert.match(css, /--shadow-topbar:/);
  assert.match(css, /--radius-card:/);
  assert.match(css, /\.co-app-shell/);
  assert.match(css, /\.co-workspace-shell/);
  assert.match(css, /\.co-topbar/);
  assert.match(css, /\.co-card/);
  assert.match(css, /\.co-sidebar-shell/);
  assert.match(css, /\.co-sidebar-nav-active/);
  assert.match(css, /\.co-table-row/);
});

test("tokens and css avoid secrets, private data, routes, and PWA regressions", () => {
  const files = [
    "src/design-tokens.js",
    "src/index.css",
    "index.html",
    "public/manifest.webmanifest",
  ].map((file) => fs.readFileSync(path.join(repoRoot, file), "utf8")).join("\n");
  const forbiddenPattern = new RegExp([
    "OPENAI" + "_API_KEY",
    "VITE_" + "OPENAI" + "_API_KEY",
    "CONCRETE" + "_OPS_IMPORT" + "_TOKEN",
    "pass" + "word\\s*=",
    "tok" + "en\\s*=",
    "process\\.env",
    "\\/" + "api\\/\\*",
    "service" + "Worker",
    "service-" + "worker",
  ].join("|"), "i");

  assert.doesNotMatch(files, forbiddenPattern);
  assert.match(files, /manifest\.webmanifest/);
  assert.match(files, /Concrete Ops 2/);
});
