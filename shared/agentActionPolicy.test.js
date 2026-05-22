import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateAgentActionPermission,
  getAgentActionPolicy,
  listAgentActionPolicies,
} from "./agentActionPolicy.js";

test("agent action policies define the major Apex workflow action classes", () => {
  const policies = listAgentActionPolicies();
  const types = policies.map((policy) => policy.commandType);

  assert.ok(types.includes("estimate-draft-review"));
  assert.ok(types.includes("estimate-packet-review"));
  assert.ok(types.includes("estimate-job-handoff-review"));
  assert.ok(types.includes("daily-closeout-readiness"));
  assert.equal(getAgentActionPolicy("daily-closeout-readiness").actionClass, "prepare_closeout_review");
  assert.match(getAgentActionPolicy("estimate-packet-review").blockedAutomation.join(" "), /No email send/);
});

test("agent policy blocks draft creation until human approval exists", () => {
  const blocked = evaluateAgentActionPermission({
    commandType: "estimate-draft-review",
    requestedActionClass: "create_draft",
    hasHumanApproval: false,
  });
  const approved = evaluateAgentActionPermission({
    commandType: "estimate-draft-review",
    requestedActionClass: "create_draft",
    hasHumanApproval: true,
  });

  assert.equal(blocked.ok, false);
  assert.match(blocked.failures.join(" "), /Human approval is required/i);
  assert.equal(approved.ok, true);
});

test("agent policy blocks customer sends and bid submission unless explicitly enabled", () => {
  const blockedSend = evaluateAgentActionPermission({
    commandType: "estimate-packet-review",
    requestedActionClass: "send_customer_message",
    hasHumanApproval: true,
  });
  const allowedByPolicy = evaluateAgentActionPermission({
    commandType: "estimate-packet-review",
    requestedActionClass: "send_customer_message",
    hasHumanApproval: true,
    companyAllowsCustomerSend: true,
  });

  assert.equal(blockedSend.ok, false);
  assert.match(blockedSend.failures.join(" "), /Customer contact actions require explicit company send approval/i);
  assert.equal(allowedByPolicy.ok, true);
});

test("agent policy blocks invoice/payment/profit-loss actions by default", () => {
  const invoice = evaluateAgentActionPermission({
    commandType: "daily-closeout-readiness",
    requestedActionClass: "create_invoice",
    hasHumanApproval: true,
  });
  const payment = evaluateAgentActionPermission({
    commandType: "daily-closeout-readiness",
    requestedActionClass: "collect_payment",
    hasHumanApproval: true,
  });
  const profitLoss = evaluateAgentActionPermission({
    commandType: "daily-closeout-readiness",
    requestedActionClass: "finalize_profit_loss",
    hasHumanApproval: true,
  });

  assert.equal(invoice.ok, false);
  assert.equal(payment.ok, false);
  assert.equal(profitLoss.ok, false);
  assert.match(invoice.failures.join(" "), /Financial actions require explicit billing approval/i);
});

test("unknown agent action types fail into human review policy", () => {
  const policy = getAgentActionPolicy("future-action");
  const result = evaluateAgentActionPermission({ commandType: "future-action" });

  assert.equal(policy.actionClass, "review_route");
  assert.equal(policy.approvalLevel, "human_approval_required");
  assert.equal(result.ok, false);
  assert.match(result.safeNextStep, /Review in the existing Apex HQ screen/i);
});
