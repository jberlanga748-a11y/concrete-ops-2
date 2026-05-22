import assert from "node:assert/strict";
import test from "node:test";

import { deriveEstimateProposalSections } from "./estimate-utils.js";
import {
  ESTIMATE_LINE_ITEM_STARTERS,
  ESTIMATE_TEMPLATE_STARTERS,
  addEstimateLineItemStarter,
  applyEstimateTemplateStarter,
  buildEstimateLineItemFromStarter,
  buildEstimateLineItemsFromRoughNotes,
  getEstimateLineItemStartersForTrade,
  getEstimateStarterTradeSummary,
  getEstimateTemplateStartersForTrade,
  normalizeEstimateTemplateStarter,
} from "./estimate-template-utils.js";
import { buildPrintDocumentHtml, deriveEstimatePrintPacket } from "./print-packets.js";

test("estimate template starters are static editable starters with blank prices", () => {
  assert.equal(ESTIMATE_TEMPLATE_STARTERS.length, 19);
  assert.equal(ESTIMATE_LINE_ITEM_STARTERS.length, 34);
  assert.equal(ESTIMATE_TEMPLATE_STARTERS.some((template) => template.title === "Concrete Flatwork"), true);
  assert.equal(ESTIMATE_TEMPLATE_STARTERS.some((template) => template.title === "ADA Ramp"), true);
  assert.equal(ESTIMATE_TEMPLATE_STARTERS.some((template) => template.title === "Fence Install"), true);
  assert.equal(ESTIMATE_TEMPLATE_STARTERS.some((template) => template.title === "Gate Repair / Replacement"), true);
  assert.equal(ESTIMATE_TEMPLATE_STARTERS.some((template) => template.title === "Roof Replacement"), true);
  assert.equal(ESTIMATE_TEMPLATE_STARTERS.some((template) => template.title === "Landscape Install"), true);
  assert.equal(ESTIMATE_TEMPLATE_STARTERS.some((template) => template.title === "Room Remodel"), true);
  assert.equal(ESTIMATE_TEMPLATE_STARTERS.some((template) => template.title === "Plumbing Service"), true);

  ESTIMATE_LINE_ITEM_STARTERS.forEach((starter) => {
    assert.equal(starter.unitPrice, "");
    assert.ok(starter.description);
    assert.ok(starter.unit);
  });

  const driveway = normalizeEstimateTemplateStarter(ESTIMATE_TEMPLATE_STARTERS.find((template) => template.id === "driveway-approach"));
  assert.equal(driveway.title, "Driveway / Approach");
  assert.equal(driveway.lineItems.every((item) => item.unitPrice === ""), true);

  const fence = normalizeEstimateTemplateStarter(ESTIMATE_TEMPLATE_STARTERS.find((template) => template.id === "fence-install"));
  assert.equal(fence.title, "Fence Install");
  assert.equal(fence.lineItems.every((item) => item.unitPrice === ""), true);
  assert.match(fence.sections.scopeOfWork, /set posts/);

  const roofing = normalizeEstimateTemplateStarter(ESTIMATE_TEMPLATE_STARTERS.find((template) => template.id === "roof-replacement"));
  assert.equal(roofing.title, "Roof Replacement");
  assert.equal(roofing.lineItems.every((item) => item.unitPrice === ""), true);
  assert.match(roofing.sections.scopeOfWork, /roofing material system/);
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

test("rough notes line item suggestions extract workable starter rows without pricing guesses", () => {
  const items = buildEstimateLineItemsFromRoughNotes("500 sf slab installation, demo old concrete, base rock, broom finish, sawcut, cleanup");

  assert.equal(items.length >= 4, true);
  assert.equal(items.some((item) => item.description === "Demo / removal"), true);
  assert.equal(items.some((item) => item.description === "Base rock / prep"), true);
  assert.equal(items.some((item) => item.description === "Concrete slab installation"), true);
  assert.equal(items.some((item) => item.description === "Finish / cleanup"), true);
  assert.equal(items.every((item) => item.unitPrice === ""), true);
  assert.equal(items.some((item) => item.quantity === 500 && item.unit === "sf"), true);
});

test("rough notes line item suggestions support fence and gate work without pricing guesses", () => {
  const items = buildEstimateLineItemsFromRoughNotes("180 lf cedar privacy fence, set posts, 2 gates with latch hardware, stain allowance, haul off old fence");

  assert.equal(items.length >= 4, true);
  assert.equal(items.some((item) => item.description === "Fence panels / rails"), true);
  assert.equal(items.some((item) => item.description === "Fence post setting"), true);
  assert.equal(items.some((item) => item.description === "Gate / hardware"), true);
  assert.equal(items.some((item) => item.description === "Stain / seal allowance"), true);
  assert.equal(items.every((item) => item.unitPrice === ""), true);
  assert.equal(items.some((item) => item.quantity === 180 && item.unit === "lf"), true);
});

test("blank rough notes do not invent line items", () => {
  assert.deepEqual(buildEstimateLineItemsFromRoughNotes(""), []);
  assert.deepEqual(buildEstimateLineItemsFromRoughNotes("   "), []);
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

test("construction-wide templates create proposal sections without pricing guesses", () => {
  const tradeTemplates = [
    ["roof-replacement", /Roof replacement proposal/, /decking allowance/i],
    ["landscape-install", /Landscape installation proposal/, /irrigation/i],
    ["remodel-room", /Remodel proposal/, /allowance/i],
    ["painting-project", /Painting proposal/, /color selections/i],
    ["excavation-sitework", /Excavation \/ sitework proposal/, /hidden-condition/i],
    ["plumbing-service", /Plumbing service proposal/, /fixture selections/i],
    ["electrical-service", /Electrical service proposal/, /permit\/inspection/i],
    ["hvac-service-replacement", /HVAC service \/ replacement proposal/, /startup/i],
  ];

  tradeTemplates.forEach(([templateId, titlePattern, contentPattern]) => {
    const draft = applyEstimateTemplateStarter({
      title: "",
      scopeSummary: "",
      customerNotes: "",
      internalNotes: "",
      items: [],
    }, templateId);
    const sections = deriveEstimateProposalSections(draft);

    assert.match(draft.title, titlePattern);
    assert.equal(draft.items.length > 0, true);
    assert.equal(draft.items.every((item) => item.unitPrice === ""), true);
    assert.match(`${sections.scopeOfWork}\n${sections.inclusions}\n${sections.exclusions}\n${sections.assumptions}\n${sections.customerNotes}`, contentPattern);
    assert.match(sections.internalNotes, /Review scope, pricing, exclusions, and totals before sending/);
  });
});

test("estimate starters can be focused by company primary trade", () => {
  const fencingTemplates = getEstimateTemplateStartersForTrade("fencing");
  assert.deepEqual(fencingTemplates.map((template) => template.id), ["fence-install", "gate-repair-replacement", "fence-repair"]);
  assert.equal(fencingTemplates.some((template) => template.id === "driveway-approach"), false);

  const fencingLineItems = getEstimateLineItemStartersForTrade("fencing");
  assert.equal(fencingLineItems.some((starter) => starter.id === "fence-panels-rails"), true);
  assert.equal(fencingLineItems.some((starter) => starter.id === "concrete-placement"), false);

  const roofingSummary = getEstimateStarterTradeSummary("roof");
  assert.equal(roofingSummary.tradeId, "roofing");
  assert.equal(roofingSummary.tradeLabel, "Roofing");
  assert.equal(getEstimateTemplateStartersForTrade("roof").some((template) => template.id === "roof-replacement"), true);
  assert.equal(getEstimateLineItemStartersForTrade("roof").some((starter) => starter.id === "roofing-shingle-system"), true);

  assert.equal(getEstimateTemplateStartersForTrade("general-contractor").length, ESTIMATE_TEMPLATE_STARTERS.length);
  assert.equal(getEstimateLineItemStartersForTrade("unknown-trade").length, ESTIMATE_LINE_ITEM_STARTERS.length);
});
