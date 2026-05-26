import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("Tool Checklist page route shell is extracted and lazy-loaded out of App", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const toolChecklistPageSource = fs.readFileSync(new URL("./tool-checklist-page-components.jsx", import.meta.url), "utf8");

  assert.match(appSource, /const ToolChecklistPage = lazyRouteComponent\(\(\) => import\("\.\/tool-checklist-page-components"\), "ToolChecklistPage"\);/);
  assert.match(toolChecklistPageSource, /export function ToolChecklistPage\b/);
  assert.match(toolChecklistPageSource, /function ToolChecklistPagePolished\b/);
  assert.match(toolChecklistPageSource, /function ToolChecklistTablePolished\b/);
  assert.match(toolChecklistPageSource, /function ToolChecklistCreatePanelPolished\b/);
  assert.match(toolChecklistPageSource, /function ToolChecklistDetailPanelPolished\b/);
  assert.match(toolChecklistPageSource, /function ToolChecklistItemsPanelPolished\b/);
  assert.match(toolChecklistPageSource, /function ToolChecklistAddItemPanelPolished\b/);

  for (const name of [
    "ToolChecklistPage",
    "ToolChecklistPagePolished",
    "ToolChecklistTablePolished",
    "ToolChecklistCommandRailPolished",
    "ToolChecklistCreatePanelPolished",
    "ToolChecklistDetailPanelPolished",
    "ToolChecklistItemsPanelPolished",
    "ToolChecklistAddItemPanelPolished",
  ]) {
    assert.doesNotMatch(appSource, new RegExp(`function ${name}\\b`));
  }
});
