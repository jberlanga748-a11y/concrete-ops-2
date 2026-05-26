import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("Apex Assistant shell is extracted from App with review-first dependencies", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const shellSource = fs.readFileSync(new URL("./apex-assistant-shell-components.jsx", import.meta.url), "utf8");

  assert.match(appSource, /import \{ ApexAssistantShell \} from "\.\/apex-assistant-shell-components";/);
  assert.match(appSource, /<ApexAssistantShell\b/);
  assert.doesNotMatch(appSource, /function ApexAssistantShell\b/);
  assert.doesNotMatch(appSource, /resolveApexAssistantCommand/);
  assert.doesNotMatch(appSource, /normalizeAgentActionProposalAuditEvent/);

  assert.match(shellSource, /export function ApexAssistantShell\b/);
  assert.match(shellSource, /deriveApexAssistantShellState/);
  assert.match(shellSource, /resolveApexAssistantCommand/);
  assert.match(shellSource, /normalizeAgentActionProposalAuditEvent/);
  assert.match(shellSource, /Manual-first: no customer contact/);
});
