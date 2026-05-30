import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("Leads page route shell is extracted and lazy-loaded out of App", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const leadsPageSource = fs.readFileSync(new URL("./leads-page-components.jsx", import.meta.url), "utf8");

  assert.match(appSource, /const LeadsPage = lazyRouteComponent\(\(\) => import\("\.\/leads-page-components"\), "LeadsPage"\);/);
  assert.match(appSource, /EstimatorMobilePipelineComponent=\{EstimatorMobilePipelinePage\}/);
  assert.match(appSource, /FollowUpQueuePanelComponent=\{FollowUpQueuePanel\}/);
  assert.match(leadsPageSource, /export function LeadsPage\b/);
  assert.match(leadsPageSource, /ApexOfficeCommandShell/);
  assert.match(leadsPageSource, /co-leads-shell-page/);
  assert.match(leadsPageSource, /function LeadCommandRail\b/);
  assert.match(leadsPageSource, /function LeadInboxReviewQueue\b/);
  assert.match(leadsPageSource, /function SalesFollowUpCommandCenter\b/);
  assert.match(leadsPageSource, /function DailySourceCheckPanel\b/);
  assert.match(leadsPageSource, /function LeadSourcesPanel\b/);
  assert.match(leadsPageSource, /deriveSalesFollowUpSystemState/);
  assert.match(leadsPageSource, /const canUseEstimatorMobilePipeline = Boolean\(MobilePipelinePage\) && isEstimatorMobilePipelineUser\(user, permissions\);/);
  assert.doesNotMatch(leadsPageSource, /AssistantRail/);

  for (const name of [
    "LeadsPage",
    "LeadCommandRail",
    "LeadInboxReviewQueue",
    "SalesFollowUpCommandCenter",
    "DailySourceCheckPanel",
    "LeadSourcesPanel",
    "isLeadWaitingOnResponse",
  ]) {
    assert.doesNotMatch(appSource, new RegExp(`function ${name}\\b`));
  }

  assert.match(appSource, /const CommunicationCenterPage = lazyRouteComponent\(\(\) => import\("\.\/communications-route-components"\), "CommunicationCenterPage"\);/);
  assert.match(appSource, /import \{ FollowUpQueuePanel \} from "\.\/follow-up-queue-panel-components"/);
  assert.doesNotMatch(appSource, /function FollowUpQueuePanel\b/);
});
