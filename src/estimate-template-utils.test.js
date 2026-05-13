import assert from "node:assert/strict";
import test from "node:test";

import { deriveEstimateProposalSections } from "./estimate-utils.js";
import {
  ESTIMATE_LINE_ITEM_STARTERS,
  ESTIMATE_TEMPLATE_STARTERS,
  addEstimateLineItemStarter,
  applyEstimateTemplateStarter,
  buildEstimateLineItemFromStarter,
  normalizeEstimateTemplateStarter,
} from "./estimate-template-utils.js";
import { buildPrintDocumentHtml, deriveEstimatePrintPacket } from "./print-packets.js";

test("estimate template starters are static editable starters with blank prices", () => {
  assert.equal(ESTIMATE_TEMPLATE_STARTERS.length, 8);
  assert.equal(ESTIMATE_LINE_ITEM_STARTERS.length, 12);
  assert.equal(ESTIMATE_TEMPLATE_STARTERS.some((template) => template.title === "Concrete Flatwork"), true);
  assert.equal(ESTIMATE_TEMPLATE_STARTERS.some((template) => template.title === "ADA Ramp"), true);

  ESTIMATE_LINE_ITEM_STARTERS.forEach((starter) => {
    assert.equal(starter.unitPrice, "");
    assert.ok(starter.description);
    assert.ok(starter.unit);
  });

  const driveway = normalizeEstimateTemplateStarter(ESTIMATE_TEMPLATE_STARTERS.find((template) => template.id === "driveway-approach"));
  assert.equal(driveway.title, "Driveway / Approach");
  assert.equal(driveway.lineItems.every((item) => item.unitPrice === ""), true);
});

test("applying a template fills existing estimate fields without adding schema fields", () => {
  const draft = applyEstimateTemplateStarter({
    customerId: "C-100",
    leadId: "L-100",
    customerEmail: "customer@example.test",
    title: "",
    status: "draft",
    scopeSummary: "",
    customerNotes: "",
    internalNotes: "",
    items: [{ description: "", quantity: 1, unit: "ea", unitPrice: "" }],
  }, "driveway-approach");

  assert.equal(draft.customerId, "C-100");
  assert.equal(draft.leadId, "L-100");
  assert.equal(draft.customerEmail, "customer@example.test");
  assert.equal(draft.title, "Driveway / approach proposal");
  assert.equal(draft.status, "draft");
  assert.equal(draft.items.length > 1, true);
  assert.equal(draft.items.every((item) => item.unitPrice === ""), true);
  assert.equal("proposalSections" in draft, false);

  const sections = deriveEstimateProposalSections(draft);
  assert.match(sections.scopeOfWork, /Prepare driveway or approach area/);
  assert.match(sections.inclusions, /reinforcement allowance/);
  assert.match(sections.exclusions, /Permit fees/);
  assert.match(sections.assumptions, /driveway access/);
  assert.match(sections.customerNotes, /Review thickness/);
  assert.match(sections.internalNotes, /Template starter: Driveway \/ Approach/);
});

test("template use preserves existing links, title, content, and line items", () => {
  const draft = applyEstimateTemplateStarter({
    customerId: "C-200",
    leadId: "L-200",
    title: "Custom patio proposal",
    scopeSummary: "Custom scope that should stay.",
    customerNotes: "Customer terms that should stay.",
    internalNotes: "Existing office note.",
    items: [{ description: "Custom line item", quantity: 2, unit: "ea", unitPrice: "125" }],
  }, "sidewalk-walkway");

  assert.equal(draft.customerId, "C-200");
  assert.equal(draft.leadId, "L-200");
  assert.equal(draft.title, "Custom patio proposal");
  assert.equal(draft.items[0].description, "Custom line item");
  assert.equal(draft.items.some((item) => item.description.includes("Sawcut")), true);

  const sections = deriveEstimateProposalSections(draft);
  assert.equal(sections.scopeOfWork, "Custom scope that should stay.");
  assert.equal(sections.customerNotes, "Customer terms that should stay.");
  assert.match(sections.internalNotes, /Existing office note/);
  assert.match(sections.internalNotes, /Template starter: Sidewalk \/ Walkway/);
});

test("line item starters create valid blank-price estimate items", () => {
  const item = buildEstimateLineItemFromStarter("base-rock");
  assert.deepEqual(item, {
    description: "Furnish, place, grade, and compact crushed rock base.",
    quantity: 1,
    unit: "ton",
    unitPrice: "",
  });

  const draft = addEstimateLineItemStarter({
    items: [{ description: "", quantity: 1, unit: "ea", unitPrice: "" }],
  }, "traffic-control-allowance");

  assert.equal(draft.items.length, 1);
  assert.equal(draft.items[0].description, "Traffic control, cones, signage, or pedestrian routing allowance where required.");
  assert.equal(draft.items[0].unitPrice, "");
});

test("template-created estimates still print customer-facing content without internal notes", () => {
  const draft = applyEstimateTemplateStarter({
    title: "",
    customer: { name: "Martinez Residence" },
    internalNotes: "Private margin note that should not print.",
    items: [],
  }, "small-commercial-slab");

  const packet = deriveEstimatePrintPacket({
    companyName: "Apex HQ Demo",
    estimate: draft,
  });
  const html = buildPrintDocumentHtml(packet);

  assert.match(html, /Small commercial slab proposal/);
  assert.match(html, /Scope of Work/);
  assert.match(html, /Inclusions/);
  assert.match(html, /Exclusions/);
  assert.match(html, /Assumptions \/ Clarifications/);
  assert.match(html, /Place concrete/);
  assert.match(html, /Base Estimate Total/);
  assert.doesNotMatch(html, /Private margin note/);
  assert.doesNotMatch(html, /Template starter:/);
});
