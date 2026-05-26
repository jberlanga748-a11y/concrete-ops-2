import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("follow-up queue panel lives outside App", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const panelSource = fs.readFileSync(new URL("./follow-up-queue-panel-components.jsx", import.meta.url), "utf8");

  assert.match(appSource, /import \{ FollowUpQueuePanel \} from "\.\/follow-up-queue-panel-components"/);
  assert.doesNotMatch(appSource, /function FollowUpQueuePanel\b/);
  assert.doesNotMatch(appSource, /buildManualOutreachContactPayload/);
  assert.doesNotMatch(appSource, /FOLLOW_UP_QUEUE_TYPE_FILTERS/);
  assert.match(panelSource, /export function FollowUpQueuePanel\b/);
  assert.match(panelSource, /deriveFollowUpQueueState/);
  assert.match(panelSource, /filterFollowUpQueueItems/);
  assert.match(panelSource, /ManualOutreachDraftPanel/);
});
