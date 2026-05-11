import { deriveEstimateProposalSections, mergeEstimateProposalSections } from "./estimate-utils.js";

function textValue(value) {
  return String(value ?? "").trim();
}

function firstText(...values) {
  return values.map(textValue).find(Boolean) || "";
}

function nonEmptyLines(values = []) {
  return values.map(textValue).filter(Boolean);
}

function appendUniqueLine(existing, line) {
  const current = textValue(existing);
  const nextLine = textValue(line);
  if (!nextLine || current.includes(nextLine)) return current;
  return nonEmptyLines([current, nextLine]).join("\n");
}

function estimateLineItemHasContent(item = {}) {
  return Boolean(textValue(item?.description) || textValue(item?.unitPrice));
}

function isBlankEstimateLineItem(item = {}) {
  const description = textValue(item?.description);
  const unitPrice = textValue(item?.unitPrice);
  const unit = textValue(item?.unit);
  const quantity = item?.quantity == null || item?.quantity === "" ? 1 : Number(item.quantity);
  return !description && !unitPrice && (!unit || unit.toLowerCase() === "ea") && (!Number.isFinite(quantity) || quantity === 1);
}

export const ESTIMATE_LINE_ITEM_STARTERS = [
  {
    id: "mobilization",
    title: "Mobilization",
    description: "Mobilization, layout, job setup, and project coordination.",
    quantity: 1,
    unit: "LS",
    unitPrice: "",
  },
  {
    id: "demo-sawcut-haul-off",
    title: "Demo / sawcut / haul-off",
    description: "Sawcut, remove existing concrete, load, haul, and dispose of debris.",
    quantity: 1,
    unit: "LS",
    unitPrice: "",
  },
  {
    id: "excavation-grading-prep",
    title: "Excavation / grading prep",
    description: "Excavate, grade, compact, and prepare subgrade for concrete placement.",
    quantity: 1,
    unit: "LS",
    unitPrice: "",
  },
  {
    id: "base-rock",
    title: "Base rock",
    description: "Furnish, place, grade, and compact crushed rock base.",
    quantity: 1,
    unit: "ton",
    unitPrice: "",
  },
  {
    id: "forming",
    title: "Forming",
    description: "Set, brace, and strip forms for concrete edges and elevations.",
    quantity: 1,
    unit: "LS",
    unitPrice: "",
  },
  {
    id: "rebar-wire-mesh",
    title: "Rebar / wire mesh",
    description: "Furnish and place reinforcing steel, wire mesh, chairs, or dowels as required.",
    quantity: 1,
    unit: "LS",
    unitPrice: "",
  },
  {
    id: "concrete-placement",
    title: "Concrete placement",
    description: "Place concrete, consolidate as needed, screed, float, and finish.",
    quantity: 1,
    unit: "yd",
    unitPrice: "",
  },
  {
    id: "pump-conveyor-allowance",
    title: "Pump / conveyor allowance",
    description: "Concrete pump, conveyor, or placement-access allowance if needed.",
    quantity: 1,
    unit: "allowance",
    unitPrice: "",
  },
  {
    id: "finish-work",
    title: "Finish work",
    description: "Finish concrete surface per proposal scope, including broom, trowel, or specified texture.",
    quantity: 1,
    unit: "LS",
    unitPrice: "",
  },
  {
    id: "cure-sawcut-cleanup",
    title: "Cure / sawcut / cleanup",
    description: "Apply curing support, sawcut control joints, strip forms, and clean the work area.",
    quantity: 1,
    unit: "LS",
    unitPrice: "",
  },
  {
    id: "traffic-control-allowance",
    title: "Traffic control allowance",
    description: "Traffic control, cones, signage, or pedestrian routing allowance where required.",
    quantity: 1,
    unit: "allowance",
    unitPrice: "",
  },
  {
    id: "disposal-trucking",
    title: "Disposal / trucking",
    description: "Trucking, dump fees, and disposal allowance for project debris or excess material.",
    quantity: 1,
    unit: "allowance",
    unitPrice: "",
  },
];

export const ESTIMATE_TEMPLATE_STARTERS = [
  {
    id: "concrete-flatwork",
    title: "Concrete Flatwork",
    description: "General patio, pad, apron, or flatwork starter.",
    estimateTitle: "Concrete flatwork proposal",
    sections: {
      scopeOfWork: "Prepare, form, place, finish, and clean up concrete flatwork per the reviewed project area.",
      inclusions: "Mobilization, subgrade prep, forming, concrete placement, standard finish work, sawcut/control joints as applicable, and cleanup.",
      exclusions: "Permits, engineering, utility relocation, unsuitable subgrade replacement, drainage corrections, and work outside the reviewed area unless added in writing.",
      assumptions: "Work area is accessible for crew and material delivery. Existing grades and base conditions are suitable after standard prep.",
      customerNotes: "Template starter only. Review scope, pricing, exclusions, and schedule before sending.",
    },
    lineItems: ["mobilization", "excavation-grading-prep", "forming", "concrete-placement", "finish-work", "cure-sawcut-cleanup"],
  },
  {
    id: "sidewalk-walkway",
    title: "Sidewalk / Walkway",
    description: "Residential or light commercial sidewalk starter.",
    estimateTitle: "Sidewalk / walkway proposal",
    sections: {
      scopeOfWork: "Remove or prepare the walkway area, form, place, finish, and clean up concrete sidewalk or walkway work.",
      inclusions: "Layout, forming, base prep, concrete placement, broom finish, joints, and cleanup.",
      exclusions: "Tree/root removal, utility relocation, permit fees, handrail work, and drainage corrections unless listed separately.",
      assumptions: "Walkway elevations and access are confirmed before work begins.",
      customerNotes: "Review width, thickness, finish, access, and any city requirements before sending.",
    },
    lineItems: ["mobilization", "demo-sawcut-haul-off", "base-rock", "forming", "concrete-placement", "finish-work", "cure-sawcut-cleanup"],
  },
  {
    id: "driveway-approach",
    title: "Driveway / Approach",
    description: "Driveway replacement, apron, or approach starter.",
    estimateTitle: "Driveway / approach proposal",
    sections: {
      scopeOfWork: "Prepare driveway or approach area, install forms and reinforcement as required, place and finish concrete, and clean up.",
      inclusions: "Sawcut/removal if selected, grading prep, forming, reinforcement allowance, concrete placement, broom finish, joints, and cleanup.",
      exclusions: "Permit fees, curb replacement, utility conflicts, drainage redesign, unsuitable base replacement, and asphalt tie-in work unless listed.",
      assumptions: "Customer will provide clear driveway access and confirm vehicle staging before work begins.",
      customerNotes: "Review thickness, reinforcement, apron limits, access, and curing timeline before sending.",
    },
    lineItems: ["mobilization", "demo-sawcut-haul-off", "excavation-grading-prep", "base-rock", "forming", "rebar-wire-mesh", "concrete-placement", "finish-work", "cure-sawcut-cleanup"],
  },
  {
    id: "ada-ramp",
    title: "ADA Ramp",
    description: "ADA ramp or accessibility concrete starter.",
    estimateTitle: "ADA ramp proposal",
    sections: {
      scopeOfWork: "Prepare, form, reinforce, place, finish, and clean up an ADA ramp or accessibility concrete improvement.",
      inclusions: "Layout, forming, base prep, concrete placement, broom finish, jointing, and cleanup.",
      exclusions: "Engineering, permit fees, detectable warning panels, handrails, guardrails, striping, and code upgrades unless listed separately.",
      assumptions: "Ramp dimensions, slopes, landing conditions, and access requirements must be reviewed before approval.",
      customerNotes: "Verify ADA/code requirements before sending. Add any detectable warning panels or rails as separate line items if needed.",
    },
    lineItems: ["mobilization", "demo-sawcut-haul-off", "excavation-grading-prep", "forming", "rebar-wire-mesh", "concrete-placement", "finish-work", "cure-sawcut-cleanup"],
  },
  {
    id: "curb-curb-gutter",
    title: "Curb / Curb & Gutter",
    description: "Curb, curb repair, or curb and gutter starter.",
    estimateTitle: "Curb / curb and gutter proposal",
    sections: {
      scopeOfWork: "Prepare, form, place, finish, and clean up curb or curb and gutter work per reviewed limits.",
      inclusions: "Layout, sawcut/removal if selected, base prep, forming, concrete placement, finish, joints, and cleanup.",
      exclusions: "Traffic control beyond allowance, city inspection fees, asphalt patching, storm drainage work, and permit fees unless listed.",
      assumptions: "Work limits, access, grades, and inspection requirements are confirmed before field work.",
      customerNotes: "Review city or site-owner requirements before sending.",
    },
    lineItems: ["mobilization", "demo-sawcut-haul-off", "excavation-grading-prep", "forming", "concrete-placement", "traffic-control-allowance", "cure-sawcut-cleanup"],
  },
  {
    id: "small-commercial-slab",
    title: "Small Commercial Slab",
    description: "Small shop, trash enclosure, equipment pad, or commercial slab starter.",
    estimateTitle: "Small commercial slab proposal",
    sections: {
      scopeOfWork: "Prepare slab area, install base/forms/reinforcement, place and finish concrete, sawcut/control joints, and clean up.",
      inclusions: "Mobilization, grading prep, base rock allowance, forming, reinforcement allowance, concrete placement, finish work, sawcut/control joints, and cleanup.",
      exclusions: "Engineering, vapor barrier, special inspection, permit fees, embeds, anchor bolts, plumbing/electrical coordination, and unsuitable subgrade replacement unless listed.",
      assumptions: "Pad dimensions, finish requirements, access, and load/use expectations are confirmed before approval.",
      customerNotes: "Confirm slab thickness, reinforcement, finish, and any inspection requirements before sending.",
    },
    lineItems: ["mobilization", "excavation-grading-prep", "base-rock", "forming", "rebar-wire-mesh", "concrete-placement", "finish-work", "cure-sawcut-cleanup"],
  },
  {
    id: "footing-stem-wall",
    title: "Footing / Stem Wall",
    description: "Footing, stem wall, or small foundation concrete starter.",
    estimateTitle: "Footing / stem wall proposal",
    sections: {
      scopeOfWork: "Excavate or prepare, form, reinforce, place concrete, strip forms, and clean up footing or stem wall work.",
      inclusions: "Layout support, excavation/prep allowance, forming, reinforcement allowance, concrete placement, stripping, and cleanup.",
      exclusions: "Engineering, permits, survey/layout staking, waterproofing, drainage, backfill, anchor bolts, and inspection fees unless listed.",
      assumptions: "Plans, dimensions, elevations, reinforcement requirements, and inspection timing are confirmed before work begins.",
      customerNotes: "Review drawings, inspection schedule, and reinforcement requirements before sending.",
    },
    lineItems: ["mobilization", "excavation-grading-prep", "forming", "rebar-wire-mesh", "concrete-placement", "pump-conveyor-allowance", "cure-sawcut-cleanup"],
  },
  {
    id: "general-concrete-repair",
    title: "General Concrete Repair",
    description: "Patch, remove/replace, or miscellaneous concrete repair starter.",
    estimateTitle: "Concrete repair proposal",
    sections: {
      scopeOfWork: "Prepare repair area, remove damaged concrete as needed, install forms or patch materials, finish repair, and clean up.",
      inclusions: "Mobilization, sawcut/removal allowance, prep, placement or patching, finish blending, and cleanup.",
      exclusions: "Structural engineering, hidden damage, drainage correction, utility conflicts, coatings, and repairs outside the reviewed area unless listed.",
      assumptions: "Repair limits and existing conditions are visible enough to price as a starter estimate.",
      customerNotes: "Review repair limits and any hidden-condition assumptions before sending.",
    },
    lineItems: ["mobilization", "demo-sawcut-haul-off", "excavation-grading-prep", "forming", "concrete-placement", "finish-work", "disposal-trucking"],
  },
];

export function normalizeEstimateLineItemStarter(starter = {}) {
  return {
    id: textValue(starter?.id),
    title: firstText(starter?.title, starter?.name, starter?.description, "Line item starter"),
    description: firstText(starter?.description, starter?.title, starter?.name),
    quantity: starter?.quantity == null || starter?.quantity === "" ? 1 : starter.quantity,
    unit: textValue(starter?.unit) || "ea",
    unitPrice: starter?.unitPrice ?? "",
  };
}

export function normalizeEstimateTemplateStarter(template = {}) {
  const normalizedLineItems = (Array.isArray(template?.lineItems) ? template.lineItems : [])
    .map((entry) => buildEstimateLineItemFromStarter(entry))
    .filter(estimateLineItemHasContent);

  return {
    id: textValue(template?.id),
    title: firstText(template?.title, template?.estimateTitle, "Estimate template"),
    description: textValue(template?.description),
    estimateTitle: firstText(template?.estimateTitle, template?.title, "Concrete proposal"),
    sections: {
      scopeOfWork: textValue(template?.sections?.scopeOfWork),
      inclusions: textValue(template?.sections?.inclusions),
      exclusions: textValue(template?.sections?.exclusions),
      assumptions: textValue(template?.sections?.assumptions),
      customerNotes: textValue(template?.sections?.customerNotes),
    },
    lineItems: normalizedLineItems,
  };
}

export function getEstimateTemplateStarter(templateId) {
  const id = textValue(templateId);
  return ESTIMATE_TEMPLATE_STARTERS.find((template) => template.id === id) || null;
}

export function getEstimateLineItemStarter(starterId) {
  const id = textValue(starterId);
  return ESTIMATE_LINE_ITEM_STARTERS.find((starter) => starter.id === id) || null;
}

export function buildEstimateLineItemFromStarter(starterOrId) {
  const starter = typeof starterOrId === "string" ? getEstimateLineItemStarter(starterOrId) : starterOrId;
  if (!starter) return null;
  const normalized = normalizeEstimateLineItemStarter(starter);
  return {
    description: normalized.description,
    quantity: normalized.quantity,
    unit: normalized.unit,
    unitPrice: normalized.unitPrice,
  };
}

export function addEstimateLineItemStarter(estimate = {}, starterOrId) {
  const lineItem = buildEstimateLineItemFromStarter(starterOrId);
  if (!lineItem) return { ...estimate };

  const existingItems = Array.isArray(estimate?.items) ? estimate.items : [];
  const keptItems = existingItems.filter((item) => !isBlankEstimateLineItem(item));

  return {
    ...estimate,
    items: [...keptItems, lineItem],
  };
}

export function applyEstimateTemplateStarter(estimate = {}, templateOrId, { overwriteContent = false } = {}) {
  const templateSource = typeof templateOrId === "string" ? getEstimateTemplateStarter(templateOrId) : templateOrId;
  if (!templateSource) return { ...estimate };

  const template = normalizeEstimateTemplateStarter(templateSource);
  const currentSections = deriveEstimateProposalSections(estimate);
  const nextSections = {
    ...currentSections,
    scopeOfWork: overwriteContent ? template.sections.scopeOfWork : firstText(currentSections.scopeOfWork, template.sections.scopeOfWork),
    inclusions: overwriteContent ? template.sections.inclusions : firstText(currentSections.inclusions, template.sections.inclusions),
    exclusions: overwriteContent ? template.sections.exclusions : firstText(currentSections.exclusions, template.sections.exclusions),
    assumptions: overwriteContent ? template.sections.assumptions : firstText(currentSections.assumptions, template.sections.assumptions),
    customerNotes: overwriteContent ? template.sections.customerNotes : firstText(currentSections.customerNotes, template.sections.customerNotes),
    internalNotes: appendUniqueLine(
      overwriteContent ? "" : currentSections.internalNotes,
      `Template starter: ${template.title}. Review scope, pricing, exclusions, and totals before sending.`,
    ),
  };

  const existingItems = Array.isArray(estimate?.items) ? estimate.items : [];
  const keptItems = overwriteContent ? [] : existingItems.filter((item) => !isBlankEstimateLineItem(item));
  const nextEstimate = mergeEstimateProposalSections({
    ...estimate,
    title: overwriteContent ? template.estimateTitle : firstText(estimate?.title, template.estimateTitle),
    status: estimate?.status || "draft",
    items: [...keptItems, ...template.lineItems],
  }, nextSections);

  return {
    ...nextEstimate,
    items: [...keptItems, ...template.lineItems],
  };
}
