import assert from "node:assert/strict";
import test from "node:test";

import {
  buildOwnerMobileContactDirectory,
  ownerMobileRecordContact,
  ownerMobileSafeContactDraft,
} from "./owner-mobile-contact-utils.js";

test("owner mobile contact directory resolves linked customer and lead contacts", () => {
  const directory = buildOwnerMobileContactDirectory({
    customers: [{ id: "cust-1", name: "Acme Concrete", phone: "503-555-0100", email: "office@example.com" }],
    leads: [{ id: "lead-1", customerId: "cust-1", contactName: "Sam", contactPhone: "503-555-0111" }],
    jobs: [{ id: "job-1", leadId: "lead-1", customerId: "cust-1" }],
  });

  assert.deepEqual(ownerMobileRecordContact({ jobId: "job-1" }, directory), {
    name: "Acme Concrete",
    phone: "503-555-0100",
    email: "office@example.com",
    moduleId: "customers",
    recordId: "cust-1",
    sourceLabel: "Customer",
  });
});

test("owner mobile drafts strip internal and private details", () => {
  const draft = ownerMobileSafeContactDraft({
    title: "Driveway SOV backup https://private.example/link",
    statusLabel: "Internal notes pending",
    publicSummary: "reviewing source urls and margin before the next step",
    contact: { name: "Riley" },
  }, "Apex HQ");

  assert.equal(draft.subject, "Apex HQ: Driveway");
  assert.match(draft.textDraft, /^Hi Riley, this is Apex HQ\./);
  assert.doesNotMatch(draft.textDraft, /https?:\/\//);
  assert.doesNotMatch(draft.textDraft, /internal notes|backup|sov|source urls|margin/i);
  assert.match(draft.emailBody, /Manual draft only/);
});
