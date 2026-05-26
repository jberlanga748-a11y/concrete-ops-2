import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("Imported job drafts route shell is extracted and lazy-loaded out of App", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const importedDraftsSource = fs.readFileSync(new URL("./imported-job-drafts-page-components.jsx", import.meta.url), "utf8");

  assert.match(appSource, /const ImportedJobDraftsPage = lazyRouteComponent\(\(\) => import\("\.\/imported-job-drafts-page-components"\), "ImportedJobDraftsPage"\);/);
  assert.match(importedDraftsSource, /export function ImportedJobDraftsPage\b/);
  assert.match(importedDraftsSource, /function ImportedJobDraftListPagePolished\b/);
  assert.match(importedDraftsSource, /function ImportedJobDraftDetailPage\b/);
  assert.match(importedDraftsSource, /function ImportedDraftImportPanelPolished\b/);
  assert.match(importedDraftsSource, /function ImportedDraftCustomerMatchCard\b/);

  for (const name of [
    "ImportedJobDraftsPage",
    "ImportedJobDraftListPagePolished",
    "ImportedJobDraftDetailPage",
    "ImportedDraftImportPanelPolished",
    "ImportedDraftCustomerMatchCard",
  ]) {
    assert.doesNotMatch(appSource, new RegExp(`function ${name}\\b`));
  }
});
