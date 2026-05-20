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
    id: "fence-line-layout",
    title: "Fence line layout",
    description: "Confirm fence line, mark post locations, verify gates, and coordinate utility locate notes.",
    quantity: 1,
    unit: "LS",
    unitPrice: "",
  },
  {
    id: "fence-post-setting",
    title: "Fence post setting",
    description: "Set fence posts plumb and aligned with appropriate footing or setting method for site conditions.",
    quantity: 1,
    unit: "LS",
    unitPrice: "",
  },
  {
    id: "fence-panels-rails",
    title: "Fence panels / rails",
    description: "Install fence rails, pickets, panels, trim, and fasteners per approved layout and height.",
    quantity: 1,
    unit: "lf",
    unitPrice: "",
  },
  {
    id: "gate-hardware",
    title: "Gate / hardware",
    description: "Install gate frame, hinges, latch hardware, stops, and final swing/alignment adjustments.",
    quantity: 1,
    unit: "ea",
    unitPrice: "",
  },
  {
    id: "fence-stain-seal",
    title: "Stain / seal allowance",
    description: "Optional stain, seal, or protective finish allowance for fence boards or trim where selected.",
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
  {
    id: "fence-install",
    title: "Fence Install",
    description: "Wood, cedar, privacy, or perimeter fence installation starter.",
    estimateTitle: "Fence installation proposal",
    sections: {
      scopeOfWork: "Lay out fence line, coordinate utility locate notes, set posts, install rails/pickets or panels, hang gates, and clean up the work area.",
      inclusions: "Mobilization, fence line layout, post setting, rails/pickets or panels, standard gate hardware, jobsite cleanup, and field photo documentation.",
      exclusions: "Permits, survey/property-line disputes, tree/root removal, retaining walls, staining/sealing, utility relocation, and hidden subsurface obstructions unless listed separately.",
      assumptions: "Fence alignment, height, material style, gate locations, and access are confirmed before production begins.",
      customerNotes: "Review fence style, height, gates, neighbor/property-line expectations, and utility locate timing before sending.",
    },
    lineItems: ["mobilization", "demo-sawcut-haul-off", "fence-line-layout", "fence-post-setting", "fence-panels-rails", "gate-hardware", "disposal-trucking"],
  },
  {
    id: "gate-repair-replacement",
    title: "Gate Repair / Replacement",
    description: "Gate replacement, hinge/latch repair, or alignment starter.",
    estimateTitle: "Gate repair / replacement proposal",
    sections: {
      scopeOfWork: "Remove or adjust existing gate components, repair or replace gate framing and hardware, align swing/clearance, and clean up.",
      inclusions: "Gate assessment, minor removal, frame or hardware replacement allowance, hinge/latch install, alignment, and cleanup.",
      exclusions: "Fence line rebuilds, custom fabrication, automated operators, access control wiring, permits, and hidden post/footing replacement unless listed separately.",
      assumptions: "Gate opening, swing direction, latch style, and post condition are verified before approval.",
      customerNotes: "Confirm gate width, hardware finish, latch expectations, and whether any adjacent fence sections need repair.",
    },
    lineItems: ["mobilization", "gate-hardware", "fence-post-setting", "disposal-trucking"],
  },
  {
    id: "fence-repair",
    title: "Fence Repair",
    description: "Leaning sections, damaged boards, rails, posts, or small fence repair starter.",
    estimateTitle: "Fence repair proposal",
    sections: {
      scopeOfWork: "Repair damaged fence sections, replace affected boards/rails/posts as scoped, restore alignment, and clean up debris.",
      inclusions: "Repair layout, damaged material removal, replacement boards/rails/posts as listed, fasteners, alignment, and cleanup.",
      exclusions: "Full fence replacement, staining/sealing, permit fees, property-line resolution, landscaping repair, and hidden rot beyond reviewed sections unless added in writing.",
      assumptions: "Repair limits are visible and accessible, and matching material is available or approved before work begins.",
      customerNotes: "Review which sections are repair-only versus replacement, and confirm material match before sending.",
    },
    lineItems: ["mobilization", "demo-sawcut-haul-off", "fence-post-setting", "fence-panels-rails", "gate-hardware", "disposal-trucking"],
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

const ROUGH_NOTES_LINE_ITEM_RULES = [
  {
    starterId: "demo-sawcut-haul-off",
    label: "Demo / removal",
    patterns: [/demo/i, /\bremove(?:d|l|)?\b/i, /\bremoval\b/i, /\btear out\b/i, /\bhaul[- ]?off\b/i, /\bsawcut\b/i],
  },
  {
    starterId: "base-rock",
    label: "Base rock / prep",
    patterns: [/\bbase rock\b/i, /\brock base\b/i, /\bsubgrade\b/i, /\baggregate\b/i],
  },
  {
    starterId: "excavation-grading-prep",
    label: "Excavation / grading prep",
    patterns: [/\bexcavat/i, /\bgrading\b/i, /\bgrade\b/i, /\bprep\b/i, /\bprepare\b/i],
  },
  {
    starterId: "concrete-placement",
    label: "Concrete slab installation",
    patterns: [/\bslab\b/i, /\bflatwork\b/i, /\bconcrete placement\b/i, /\bplace concrete\b/i, /\bpour concrete\b/i, /\bpour\b/i, /\binstall concrete\b/i],
  },
  {
    starterId: "fence-line-layout",
    label: "Fence line layout",
    patterns: [/\bfence line\b/i, /\bproperty line\b/i, /\bpost locations?\b/i, /\butility locate\b/i, /\blocate\b/i],
  },
  {
    starterId: "fence-post-setting",
    label: "Fence post setting",
    patterns: [/\bfence posts?\b/i, /\bpost setting\b/i, /\bset posts?\b/i, /\bleaning posts?\b/i],
  },
  {
    starterId: "fence-panels-rails",
    label: "Fence panels / rails",
    patterns: [/\bfenc(?:e|ing)\b/i, /\bpickets?\b/i, /\bpanels?\b/i, /\brails?\b/i, /\bprivacy fence\b/i, /\bcedar fence\b/i, /\bvinyl fence\b/i, /\bchain[- ]?link\b/i],
  },
  {
    starterId: "gate-hardware",
    label: "Gate / hardware",
    patterns: [/\bgates?\b/i, /\bhinges?\b/i, /\blatches?\b/i, /\bhardware\b/i, /\bswing\b/i],
  },
  {
    starterId: "fence-stain-seal",
    label: "Stain / seal allowance",
    patterns: [/\bstain\b/i, /\bseal(?:er|ing)?\b/i, /\bfinish coat\b/i],
  },
  {
    starterId: "finish-work",
    label: "Finish / cleanup",
    patterns: [/\bfinish\b/i, /\bbroom\b/i, /\btrowel\b/i, /\bcleanup\b/i, /\bclean up\b/i],
  },
  {
    starterId: "cure-sawcut-cleanup",
    label: "Sawcut / cleanup",
    patterns: [/\bsawcut\b/i, /\bsaw-cut\b/i, /\bcontrol joints?\b/i, /\bcure\b/i],
  },
  {
    starterId: "rebar-wire-mesh",
    label: "Reinforcement",
    patterns: [/\brebar\b/i, /\bwire mesh\b/i, /\breinforcement\b/i, /\bmesh\b/i, /\bdowel/i],
  },
  {
    starterId: "forming",
    label: "Forming",
    patterns: [/\bform\b/i, /\bforming\b/i],
  },
  {
    starterId: "traffic-control-allowance",
    label: "Traffic control",
    patterns: [/\btraffic\b/i, /\bcone\b/i, /\bsignage\b/i],
  },
  {
    starterId: "disposal-trucking",
    label: "Disposal / trucking",
    patterns: [/\bdispose\b/i, /\bdisposal\b/i, /\bdump\b/i, /\bhaul\b/i, /\btrucking\b/i],
  },
];

function normalizeRoughNotesUnit(unit = "") {
  const normalized = String(unit || "").trim().toLowerCase();
  if (!normalized) return "";
  if (["sq ft", "sqft", "square feet", "square foot"].includes(normalized)) return "sf";
  if (["yds", "yard", "yards"].includes(normalized)) return "yd";
  if (["cu yd", "cu yds", "cubic yard", "cubic yards", "cuyd", "cy"].includes(normalized)) return "cy";
  if (["linear feet", "linear foot", "feet", "foot", "ft"].includes(normalized)) return "lf";
  if (["each", "ea"].includes(normalized)) return "ea";
  if (["lump sum", "ls"].includes(normalized)) return "LS";
  return normalized;
}

function parseRoughNotesQuantity(fragment = "") {
  const match = String(fragment || "").match(/(\d+(?:\.\d+)?)\s*(sf|sq\.?\s*ft|square feet?|yds?|yards?|cy|cu\.?\s*yds?|cubic yards?|lf|linear feet?|ft|feet?|ea|each|ls|lump sum)\b/i);
  if (!match) return null;
  const quantity = Number(match[1]);
  if (!Number.isFinite(quantity) || quantity < 0) return null;
  return {
    quantity,
    unit: normalizeRoughNotesUnit(match[2]),
  };
}

function roughNotesFragments(text = "") {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .split(/[\n,;•]+/g)
    .map((line) => line.trim())
    .filter(Boolean);
}

function roughNotesSeedText(roughNotes = "", result = {}) {
  return [
    roughNotes,
    result?.suggestedTitle,
    result?.scopeOfWork,
    Array.isArray(result?.inclusions) ? result.inclusions.join("\n") : "",
    Array.isArray(result?.exclusions) ? result.exclusions.join("\n") : "",
    Array.isArray(result?.assumptions) ? result.assumptions.join("\n") : "",
    result?.customerNotes,
    result?.gcProposalSummary,
    result?.gcCoverNote,
    result?.gcQualifications,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join("\n");
}

function buildRoughNotesLineItem(rule, fragment = "") {
  const starter = getEstimateLineItemStarter(rule.starterId);
  if (!starter) return null;
  const amount = parseRoughNotesQuantity(fragment);
  const item = buildEstimateLineItemFromStarter(starter);
  return {
    ...item,
    description: rule.label || starter.title || item.description,
    ...(amount ? { quantity: amount.quantity, unit: amount.unit } : {}),
  };
}

export function buildEstimateLineItemsFromRoughNotes(roughNotes = "", result = {}) {
  const seed = roughNotesSeedText(roughNotes, result);
  if (!seed) return [];

  const fragments = roughNotesFragments(seed);
  const items = [];
  const seenStarterIds = new Set();

  const addSuggestion = (rule, fragment = "") => {
    if (seenStarterIds.has(rule.starterId)) return;
    const item = buildRoughNotesLineItem(rule, fragment);
    if (!item) return;
    seenStarterIds.add(rule.starterId);
    items.push(item);
  };

  fragments.forEach((fragment) => {
    const rule = ROUGH_NOTES_LINE_ITEM_RULES.find((entry) => entry.patterns.some((pattern) => pattern.test(fragment)));
    if (rule) addSuggestion(rule, fragment);
  });

  if (items.length === 0) {
    const normalized = seed.toLowerCase();
    for (const rule of ROUGH_NOTES_LINE_ITEM_RULES) {
      if (seenStarterIds.has(rule.starterId)) continue;
      if (rule.patterns.some((pattern) => pattern.test(normalized))) {
        addSuggestion(rule, seed);
      }
    }
  }

  return items;
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
