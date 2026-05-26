import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("manual outreach draft panel lives outside App", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const panelSource = fs.readFileSync(new URL("./manual-outreach-panel-components.jsx", import.meta.url), "utf8");

  assert.match(appSource, /import \{ ManualOutreachDraftPanel \} from "\.\/manual-outreach-panel-components"/);
  assert.match(appSource, /import \{ buildManualOutreachContactPayload \} from "\.\/manual-outreach-drafts"/);
  assert.doesNotMatch(appSource, /buildManualOutreachDrafts/);
  assert.doesNotMatch(appSource, /function ManualOutreachDraftPanel\b/);
  assert.match(panelSource, /export function ManualOutreachDraftPanel\b/);
  assert.match(panelSource, /buildManualOutreachDrafts/);
  assert.match(panelSource, /from "\.\/app-shell-components"/);
});
