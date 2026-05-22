const TEXT_LIMIT = 280;

function text(value, limit = TEXT_LIMIT) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, limit);
}

function unique(values = []) {
  const seen = new Set();
  const rows = [];
  values.map((value) => text(value)).filter(Boolean).forEach((value) => {
    const key = value.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    rows.push(value);
  });
  return rows;
}

function profile({
  id,
  label,
  aliases = [],
  optionFamilies = [],
  lineItemStarters = [],
  proposalSections = [],
  fieldHandoffChecklist = [],
  proofPhotoChecklist = [],
  changeOrderWatchouts = [],
  closeoutChecks = [],
}) {
  return {
    id,
    label,
    aliases,
    optionFamilies,
    lineItemStarters,
    proposalSections,
    fieldHandoffChecklist,
    proofPhotoChecklist,
    changeOrderWatchouts,
    closeoutChecks,
  };
}

export const CONSTRUCTION_TRADE_PROFILES = [
  profile({
    id: "concrete",
    label: "Concrete",
    aliases: ["concrete", "flatwork", "driveway", "sidewalk", "slab", "patio", "foundation", "curb", "ada ramp", "broom", "stamped"],
    optionFamilies: ["Broom finish", "Sand finish", "Stamped concrete", "Exposed aggregate", "Colored concrete", "Sealer", "Reinforcement upgrade"],
    lineItemStarters: ["Demo / sawcut / haul-off", "Excavation / grading prep", "Base rock", "Forming", "Rebar / wire mesh", "Concrete placement", "Finish work", "Cure / sawcut / cleanup"],
    proposalSections: ["Scope by area", "Thickness and reinforcement", "Finish selection", "Jointing / sawcut plan", "Access and pump notes"],
    fieldHandoffChecklist: ["Confirm layout and elevations", "Call in utility locate", "Verify base and forms", "Capture pre-pour photos", "Confirm finish type", "Capture final photos"],
    proofPhotoChecklist: ["Before condition", "Base/subgrade", "Forms/rebar", "Pour in progress", "Finish closeups", "Sawcuts/cleanup"],
    changeOrderWatchouts: ["Unsuitable subgrade", "Extra demo depth", "Drainage correction", "Utility conflict", "Finish/color change", "Access or pump requirement"],
    closeoutChecks: ["Actual yards vs estimated", "Crew hours vs estimate", "Added demo/base work", "Change orders captured", "Photos attached", "Ready-to-bill total reviewed"],
  }),
  profile({
    id: "fencing",
    label: "Fencing",
    aliases: ["fence", "fencing", "cedar", "privacy fence", "chain link", "vinyl fence", "gate", "post", "picket", "rail"],
    optionFamilies: ["Cedar privacy", "Chain link", "Vinyl", "Horizontal slat", "Shadowbox", "Postmaster posts", "Single gate", "Double gate", "Stain / seal"],
    lineItemStarters: ["Fence line layout", "Post setting", "Panels / rails / pickets", "Gate hardware", "Demo and haul-off", "Stain / seal allowance"],
    proposalSections: ["Linear footage", "Fence height", "Material/style", "Gate count and hardware", "Property-line assumptions"],
    fieldHandoffChecklist: ["Confirm fence line", "Verify utility locate", "Mark post spacing", "Confirm gate swings", "Capture post-set photos", "Capture finished run photos"],
    proofPhotoChecklist: ["Existing fence/line", "Post holes", "Posts set", "Rails/panels", "Gate hardware", "Finished elevations"],
    changeOrderWatchouts: ["Rocky digging", "Rotten hidden posts", "Property line dispute", "Extra gates", "Grade step-down changes", "Material style change"],
    closeoutChecks: ["Installed LF vs estimate", "Gate count/hardware", "Post count", "Crew hours", "Disposal quantity", "Punch list photos"],
  }),
  profile({
    id: "roofing",
    label: "Roofing",
    aliases: ["roof", "roofing", "shingle", "tear off", "underlayment", "flashing", "ridge vent", "gutter"],
    optionFamilies: ["Architectural shingles", "Metal roofing", "Tear-off", "Overlay where allowed", "Synthetic underlayment", "Ice/water shield", "Vent upgrade", "Gutter add-on"],
    lineItemStarters: ["Tear-off and disposal", "Decking repair allowance", "Underlayment", "Shingle install", "Flashing", "Ventilation", "Cleanup and magnet sweep"],
    proposalSections: ["Roof squares", "Material system", "Decking assumptions", "Flashing/penetrations", "Warranty notes"],
    fieldHandoffChecklist: ["Confirm roof access", "Protect landscaping", "Verify material delivery", "Capture decking photos", "Document flashing", "Final magnet sweep"],
    proofPhotoChecklist: ["Before roof", "Tear-off", "Decking condition", "Underlayment", "Flashing details", "Finished roof"],
    changeOrderWatchouts: ["Rotten decking", "Extra layers", "Flashing rebuild", "Ventilation changes", "Weather delay", "Disposal overage"],
    closeoutChecks: ["Squares installed", "Decking sheets used", "Material returns", "Crew hours", "Warranty packet", "Final cleanup photos"],
  }),
  profile({
    id: "landscaping",
    label: "Landscaping",
    aliases: ["landscape", "landscaping", "irrigation", "sod", "turf", "retaining wall", "pavers", "grading", "planting"],
    optionFamilies: ["Sod", "Artificial turf", "Irrigation", "Plant package", "Rock/mulch", "Pavers", "Retaining wall", "Drainage"],
    lineItemStarters: ["Site prep/grading", "Demo/removal", "Irrigation", "Soil/rock/mulch", "Planting", "Sod/turf", "Pavers/wall", "Cleanup"],
    proposalSections: ["Area takeoff", "Material selections", "Drainage assumptions", "Plant/irrigation scope", "Maintenance notes"],
    fieldHandoffChecklist: ["Confirm limits", "Locate utilities/irrigation", "Verify material delivery", "Document grading", "Capture installed materials", "Walk final punch list"],
    proofPhotoChecklist: ["Before condition", "Excavation/grading", "Irrigation rough-in", "Material delivery", "Installed areas", "Final cleanup"],
    changeOrderWatchouts: ["Hidden irrigation", "Drainage issue", "Extra excavation", "Material substitution", "Access restriction", "Plant count change"],
    closeoutChecks: ["Installed quantities", "Material receipts", "Crew hours", "Punch list", "Watering/maintenance notes", "Customer signoff"],
  }),
  profile({
    id: "remodeling",
    label: "Remodeling",
    aliases: ["remodel", "remodeling", "renovation", "kitchen", "bath", "flooring", "drywall", "trim", "carpentry"],
    optionFamilies: ["Good / Better / Best material levels", "Allowance items", "Demo only", "Paint/trim add-on", "Fixture upgrade", "Flooring option"],
    lineItemStarters: ["Demo/protection", "Framing/carpentry", "Drywall/patch", "Flooring", "Paint/finish", "Fixtures/material allowance", "Cleanup"],
    proposalSections: ["Room/area scope", "Allowance schedule", "Excluded trades", "Customer selections", "Access and dust protection"],
    fieldHandoffChecklist: ["Confirm selections", "Protect occupied areas", "Document demo condition", "Track allowances", "Capture rough-in photos", "Final punch walk"],
    proofPhotoChecklist: ["Before room", "Protection", "Demo", "Rough-in", "Finish stages", "Final detail photos"],
    changeOrderWatchouts: ["Hidden damage", "Selection changes", "Unplanned trade work", "Code/inspection item", "Material lead time", "Occupied home access"],
    closeoutChecks: ["Allowance true-up", "Change orders", "Sub invoices", "Crew hours", "Punch list", "Warranty/closeout notes"],
  }),
  profile({
    id: "painting",
    label: "Painting",
    aliases: ["paint", "painting", "stain", "coating", "primer", "interior paint", "exterior paint"],
    optionFamilies: ["Interior repaint", "Exterior repaint", "Primer", "Cabinet paint", "Stain/seal", "Premium coating", "Color change"],
    lineItemStarters: ["Surface prep", "Mask/protection", "Primer", "Paint/coating", "Caulk/patch", "Cleanup"],
    proposalSections: ["Areas/rooms", "Surface prep level", "Coating system", "Color assumptions", "Excluded repairs"],
    fieldHandoffChecklist: ["Confirm colors", "Protect areas", "Document prep", "Capture coat progress", "Inspect touchups", "Final cleanup"],
    proofPhotoChecklist: ["Before surfaces", "Masking/protection", "Prep repairs", "Primer", "Finish coats", "Touchups/final"],
    changeOrderWatchouts: ["Extra prep", "Color change", "Additional rooms", "Rot/damage repair", "Access/scaffold need", "Material upgrade"],
    closeoutChecks: ["Areas completed", "Material used", "Touchup list", "Crew hours", "Customer signoff", "Warranty notes"],
  }),
  profile({
    id: "excavation",
    label: "Excavation",
    aliases: ["excavation", "excavate", "grading", "trenching", "sitework", "drainage", "utility trench", "backfill"],
    optionFamilies: ["Rough grading", "Trenching", "Drainage", "Base prep", "Haul-off", "Rock import", "Backfill/compaction"],
    lineItemStarters: ["Mobilization", "Locate/layout", "Excavation", "Haul-off", "Import/base rock", "Backfill/compaction", "Final grading"],
    proposalSections: ["Cut/fill assumptions", "Access/equipment", "Material import/export", "Utility locate", "Compaction requirements"],
    fieldHandoffChecklist: ["Confirm locate", "Verify cut limits", "Capture before grade", "Track loads", "Document compaction", "Final grade photos"],
    proofPhotoChecklist: ["Before grade", "Locate marks", "Excavation progress", "Material loads", "Backfill/compaction", "Final grade"],
    changeOrderWatchouts: ["Rock", "Wet/unsuitable soils", "Unknown utilities", "Extra haul-off", "Access restrictions", "Design changes"],
    closeoutChecks: ["Loads hauled/imported", "Machine hours", "Crew hours", "Compaction/proof", "Change orders", "Final quantities"],
  }),
  profile({
    id: "plumbing",
    label: "Plumbing",
    aliases: ["plumbing", "plumber", "pipe", "water heater", "drain", "sewer", "fixture", "rough-in"],
    optionFamilies: ["Repair", "Fixture replacement", "Water heater", "Drain/sewer", "Rough-in", "Finish trim", "Inspection add-on"],
    lineItemStarters: ["Diagnostic", "Demo/access", "Rough-in piping", "Fixture install", "Testing", "Patch/cleanup"],
    proposalSections: ["Fixture/equipment scope", "Access assumptions", "Code/permit notes", "Excluded patching", "Testing plan"],
    fieldHandoffChecklist: ["Confirm shutoff/access", "Protect work area", "Document existing condition", "Pressure/test", "Capture finish photos", "Review customer operation"],
    proofPhotoChecklist: ["Existing condition", "Access opened", "Rough-in", "Test/pressure", "Finished fixtures", "Cleanup"],
    changeOrderWatchouts: ["Hidden pipe damage", "Code upgrade", "Access/patching", "Fixture change", "Permit/inspection", "Water damage"],
    closeoutChecks: ["Fixtures/materials installed", "Tests complete", "Inspection status", "Crew hours", "Patch exclusions", "Customer signoff"],
  }),
  profile({
    id: "electrical",
    label: "Electrical",
    aliases: ["electrical", "electrician", "panel", "circuit", "outlet", "lighting", "service", "rough-in"],
    optionFamilies: ["Troubleshoot", "New circuit", "Panel work", "Lighting", "Device replacement", "Low voltage", "Permit/inspection"],
    lineItemStarters: ["Diagnostic", "Rough-in wiring", "Panel/device work", "Fixture/device install", "Testing", "Permit/inspection support"],
    proposalSections: ["Circuit/device count", "Access assumptions", "Permit/code notes", "Excluded patching", "Testing plan"],
    fieldHandoffChecklist: ["Confirm power/access", "Protect work area", "Document existing panel", "Label circuits", "Test devices", "Capture final photos"],
    proofPhotoChecklist: ["Existing panel/area", "Rough-in", "Device/fixture install", "Panel labels", "Testing", "Final cleanup"],
    changeOrderWatchouts: ["Code upgrade", "Panel capacity", "Hidden access issue", "Fixture change", "Permit/inspection", "Patch/paint exclusion"],
    closeoutChecks: ["Devices/circuits complete", "Inspection status", "Testing complete", "Crew hours", "Material used", "Customer signoff"],
  }),
  profile({
    id: "hvac",
    label: "HVAC",
    aliases: ["hvac", "heat pump", "furnace", "ac", "air conditioner", "duct", "mini split", "thermostat"],
    optionFamilies: ["Repair", "Replacement", "Mini-split", "Heat pump", "Ductwork", "Thermostat", "Maintenance"],
    lineItemStarters: ["Diagnostic", "Equipment replacement", "Duct/accessory work", "Electrical/controls coordination", "Startup/testing", "Disposal"],
    proposalSections: ["Equipment scope", "Access assumptions", "Electrical/permit notes", "Ductwork exclusions", "Startup/testing"],
    fieldHandoffChecklist: ["Confirm equipment", "Protect areas", "Document existing unit", "Track startup readings", "Verify controls", "Capture final install"],
    proofPhotoChecklist: ["Existing equipment", "Removed equipment", "New unit placement", "Duct/lineset", "Startup readings", "Final install"],
    changeOrderWatchouts: ["Electrical upgrade", "Duct modification", "Access issue", "Equipment substitution", "Permit/inspection", "Condensate/drain changes"],
    closeoutChecks: ["Equipment serials", "Startup readings", "Permit/inspection", "Crew hours", "Warranty registration", "Customer handoff"],
  }),
  profile({
    id: "general-contractor",
    label: "General Contractor",
    aliases: ["general contractor", "gc", "contractor", "construction", "commercial", "residential", "tenant improvement", "buildout"],
    optionFamilies: ["Base scope", "Alternate scopes", "Allowance schedule", "Subcontractor packages", "Phasing", "Change-order reserve"],
    lineItemStarters: ["Mobilization", "Demo/protection", "Trade package", "Materials/allowance", "Project management", "Cleanup/closeout"],
    proposalSections: ["Base scope", "Alternates", "Allowances", "Exclusions", "Schedule/phasing", "Subcontractor assumptions"],
    fieldHandoffChecklist: ["Confirm scope and subs", "Review schedule", "Capture before photos", "Track RFIs/change orders", "Collect daily proof", "Close punch list"],
    proofPhotoChecklist: ["Before condition", "Trade progress", "Material deliveries", "Inspections", "Punch list", "Final completion"],
    changeOrderWatchouts: ["Hidden conditions", "Owner selection change", "Sub scope gap", "Schedule delay", "Permit/inspection", "Allowance overage"],
    closeoutChecks: ["Sub invoices", "Change orders", "Allowance true-up", "Crew/sub hours", "Proof photos", "Billing draft"],
  }),
];

const PROFILE_BY_ID = new Map(CONSTRUCTION_TRADE_PROFILES.map((entry) => [entry.id, entry]));
const ALIAS_TO_ID = new Map(CONSTRUCTION_TRADE_PROFILES.flatMap((entry) => [
  [entry.id, entry.id],
  [entry.label.toLowerCase(), entry.id],
  ...entry.aliases.map((alias) => [alias.toLowerCase(), entry.id]),
]));

export function getConstructionTradeProfile(tradeId = "general-contractor") {
  const normalized = normalizeConstructionTradeId(tradeId) || "general-contractor";
  return PROFILE_BY_ID.get(normalized) || PROFILE_BY_ID.get("general-contractor");
}

export function normalizeConstructionTradeId(value = "") {
  const normalized = text(value).toLowerCase().replace(/[_/]+/g, "-").replace(/\s+/g, "-");
  if (!normalized) return "";
  if (PROFILE_BY_ID.has(normalized)) return normalized;
  return ALIAS_TO_ID.get(text(value).toLowerCase()) || "";
}

export function inferConstructionTradeFromText(...values) {
  const haystack = unique(values.flatMap((value) => Array.isArray(value) ? value : [value])).join(" ").toLowerCase();
  if (!haystack) return "general-contractor";

  let best = { id: "general-contractor", score: 0 };
  CONSTRUCTION_TRADE_PROFILES.forEach((entry) => {
    const terms = [entry.label, entry.id, ...entry.aliases].map((term) => text(term).toLowerCase()).filter(Boolean);
    const score = terms.reduce((sum, term) => {
      if (!term) return sum;
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = new RegExp(`\\b${escaped.replace(/\\ /g, "\\s+")}\\b`, "i");
      return sum + (pattern.test(haystack) ? Math.max(1, term.split(/\s+/).length) : 0);
    }, 0);
    if (score > best.score) best = { id: entry.id, score };
  });

  return best.id;
}

export function buildConstructionAgentTradeContext({
  trade = "",
  companySettings = {},
  lead = {},
  estimate = {},
  source = {},
  roughNotes = "",
} = {}) {
  const inferredTradeId = normalizeConstructionTradeId(trade) || inferConstructionTradeFromText(
    companySettings.primaryTrade,
    companySettings.tradeFocus,
    companySettings.serviceArea,
    lead.trade,
    lead.project,
    lead.description,
    lead.notes,
    source.tradeFocus,
    estimate.trade,
    estimate.title,
    estimate.scopeSummary,
    roughNotes,
  );
  const profile = getConstructionTradeProfile(inferredTradeId);

  return {
    tradeId: profile.id,
    tradeLabel: profile.label,
    optionFamilies: profile.optionFamilies.slice(0, 10),
    lineItemStarters: profile.lineItemStarters.slice(0, 10),
    proposalSections: profile.proposalSections.slice(0, 8),
    fieldHandoffChecklist: profile.fieldHandoffChecklist.slice(0, 8),
    proofPhotoChecklist: profile.proofPhotoChecklist.slice(0, 8),
    changeOrderWatchouts: profile.changeOrderWatchouts.slice(0, 8),
    closeoutChecks: profile.closeoutChecks.slice(0, 8),
    safetyBoundary: "Use this as review-only trade guidance. Do not invent pricing, promise schedule, submit bids, send messages, or mutate job/billing records without an approved Apex action.",
  };
}
