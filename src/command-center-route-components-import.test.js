import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("App imports extracted command center presentation cards", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const commandComponentsSource = fs.readFileSync(new URL("./command-center-route-components.jsx", import.meta.url), "utf8");

  for (const name of [
    "CommandCenterMorningFlowCard",
    "CommandCenterItem",
    "CommandCenterKpiCard",
    "CommandCenterOpsPulseCard",
    "CommandCenterOwnerHealthCard",
    "CommandCenterProofChainCard",
    "CommandCenterQuickAction",
    "CommandCenterSection",
    "CommandCenterSummaryCard",
    "CommandCenterTableCard",
    "CommandCenterWatchtowerCard",
    "FieldOpsAgentSummaryCard",
    "ModuleKpiStrip",
  ]) {
    assert.match(commandComponentsSource, new RegExp(`export function ${name}\\b`));
    assert.match(appSource, new RegExp(`import \\{[^}]*${name}[^}]*\\} from "\\./command-center-route-components"`, "s"));
    assert.doesNotMatch(appSource, new RegExp(`function ${name}\\(`));
  }
});
