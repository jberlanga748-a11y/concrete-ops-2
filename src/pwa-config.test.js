import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = process.cwd();
const manifestPath = path.join(repoRoot, "public", "manifest.webmanifest");
const htmlPath = path.join(repoRoot, "index.html");
const envSecretPattern = new RegExp([
  "OPENAI" + "_API_KEY",
  "VITE_" + "OPENAI" + "_API_KEY",
  "CONCRETE" + "_OPS_IMPORT" + "_TOKEN",
].join("|"), "i");
const credentialValuePattern = /password\s*=|token\s*=/i;
const privateCachePattern = new RegExp([
  "service" + "Worker",
  "service-" + "worker",
  "navigator\\." + "service" + "Worker",
  "caches" + "\\.open",
  "work" + "box",
  "\\/" + "api\\/\\*",
].join("|"), "i");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

test("PWA manifest exists with installable Apex HQ metadata", () => {
  assert.equal(fs.existsSync(manifestPath), true);
  const manifest = readJson(manifestPath);

  assert.equal(manifest.name, "Apex HQ");
  assert.equal(manifest.short_name, "Apex HQ");
  assert.match(manifest.description, /Contractor operations platform/i);
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.scope, "/");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.orientation, "portrait-primary");
  assert.match(manifest.theme_color, /^#[0-9A-F]{6}$/i);
  assert.match(manifest.background_color, /^#[0-9A-F]{6}$/i);
  assert.deepEqual(manifest.categories, ["business", "productivity"]);
});

test("manifest icon entries reference local PNG files that exist", () => {
  const manifest = readJson(manifestPath);
  const icons = Array.isArray(manifest.icons) ? manifest.icons : [];
  const iconPaths = icons.map((icon) => icon.src);

  assert.ok(iconPaths.includes("/icons/icon-192.png"));
  assert.ok(iconPaths.includes("/icons/icon-512.png"));
  assert.ok(iconPaths.includes("/icons/maskable-192.png"));
  assert.ok(iconPaths.includes("/icons/maskable-512.png"));
  assert.ok(icons.some((icon) => icon.purpose === "maskable"));

  for (const icon of icons) {
    assert.equal(icon.type, "image/png");
    assert.match(icon.sizes, /^\d+x\d+$/);
    const filePath = path.join(repoRoot, "public", icon.src.replace(/^\//, ""));
    assert.equal(fs.existsSync(filePath), true, `${icon.src} should exist`);
    assert.ok(fs.statSync(filePath).size > 100, `${icon.src} should not be empty`);
  }
});

test("index html links the manifest and mobile app metadata without secrets", () => {
  const html = fs.readFileSync(htmlPath, "utf8");

  assert.match(html, /<link rel="manifest" href="\/manifest\.webmanifest"/);
  assert.match(html, /<meta name="theme-color" content="#F97316"/);
  assert.match(html, /<meta name="apple-mobile-web-app-capable" content="yes"/);
  assert.match(html, /<meta name="apple-mobile-web-app-title" content="Apex HQ"/);
  assert.match(html, /<meta name="apple-mobile-web-app-status-bar-style" content="default"/);
  assert.match(html, /<meta name="mobile-web-app-capable" content="yes"/);
  assert.match(html, /<link rel="apple-touch-icon" href="\/icons\/icon-192\.png"/);
  assert.match(html, /Contractor operations platform for leads, jobs, crews, reports, photos, checklists, and owner workflow/i);

  assert.doesNotMatch(html, envSecretPattern);
  assert.doesNotMatch(html, credentialValuePattern);
});

test("PWA configuration does not add private-data caching or offline editing claims", () => {
  const changedFiles = [
    "index.html",
    "public/manifest.webmanifest",
    "src/App.jsx",
  ].map((file) => fs.readFileSync(path.join(repoRoot, file), "utf8")).join("\n");

  assert.doesNotMatch(changedFiles, privateCachePattern);
  const offlineClaimPattern = new RegExp([
    "offline editing is " + "enabled",
    "works " + "offline",
    "cache API " + "responses",
  ].join("|"), "i");
  assert.doesNotMatch(changedFiles, offlineClaimPattern);
  assert.doesNotMatch(changedFiles, envSecretPattern);
});

test("server exposes PWA static assets without changing API behavior", () => {
  const serverSource = fs.readFileSync(path.join(repoRoot, "server", "index.js"), "utf8");

  assert.match(serverSource, /app\.use\("\/icons", express\.static\(path\.join\(distDir, "icons"\)\)\)/);
  assert.match(serverSource, /app\.use\("\/brand", express\.static\(path\.join\(distDir, "brand"\)\)\)/);
  assert.match(serverSource, /app\.get\("\/manifest\.webmanifest"/);
  assert.match(serverSource, /application\/manifest\+json/);
});
