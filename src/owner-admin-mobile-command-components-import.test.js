import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("owner admin mobile command page is extracted and lazy-loaded from App", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const wrapperSource = fs.readFileSync(new URL("./dashboard-route-wrapper-components.jsx", import.meta.url), "utf8");
  const commandSource = fs.readFileSync(new URL("./owner-admin-mobile-command-components.jsx", import.meta.url), "utf8");
  const guardSource = fs.readFileSync(new URL("./owner-admin-mobile-command-utils.js", import.meta.url), "utf8");

  assert.match(appSource, /const OwnerAdminMobileCommandPage = lazyRouteComponent\(\(\) => import\("\.\/owner-admin-mobile-command-components"\), "OwnerAdminMobileCommandPage"\);/);
  assert.match(appSource, /import \{ isOwnerAdminMobileCommandUser \} from "\.\/owner-admin-mobile-command-utils";/);
  assert.match(wrapperSource, /<OwnerAdminMobileCommandPage \{\.\.\.props\} \/>/);

  assert.match(commandSource, /export function OwnerAdminMobileCommandPage\b/);
  assert.match(commandSource, /export function buildOwnerAdminMobileCommandQueue\b/);
  assert.match(commandSource, /import \{ buildOwnerMobileContactDirectory, ownerMobileRecordContact, ownerMobileSafeContactDraft \} from "\.\/owner-mobile-contact-utils";/);
  assert.match(guardSource, /export function isOwnerAdminMobileCommandUser\b/);

  for (const name of [
    "OwnerAdminMobileCommandPage",
    "buildOwnerAdminMobileCommandQueue",
  ]) {
    assert.doesNotMatch(appSource, new RegExp(`function ${name}\\b`));
  }
});
