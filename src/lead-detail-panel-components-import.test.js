import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("Lead detail panel is extracted and lazy-loaded from App", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const detailSource = fs.readFileSync(new URL("./lead-detail-panel-components.jsx", import.meta.url), "utf8");

  assert.match(appSource, /const LeadDetailPanel = lazyRouteComponent\(\(\) => import\("\.\/lead-detail-panel-components"\), "LeadDetailPanel"\);/);
  assert.match(appSource, /<LeadDetailPanel lead=\{selectedLead\}/);

  assert.match(detailSource, /export function LeadDetailPanel\b/);
  assert.match(detailSource, /import \{ SaveStateText, TimestampMeta \} from "\.\/app-status-components";/);
  assert.match(detailSource, /import \{ ContactHistoryPanel \} from "\.\/contact-history-route-components";/);
  assert.match(detailSource, /LeadPilotWorkflowReadinessCard/);
  assert.match(detailSource, /LeadAiAssistantCard/);

  assert.doesNotMatch(appSource, /function LeadDetailPanel\b/);
  assert.doesNotMatch(appSource, /import \{ ContactHistoryPanel \} from "\.\/contact-history-route-components"/);
});
