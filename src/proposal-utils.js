export const PROPOSAL_STORAGE_KEY = "last-yard-concrete/proposals-v1";
export const PROPOSAL_COMPANY_STORAGE_KEY = "last-yard-concrete/proposal-company-defaults-v1";

export const PROPOSAL_STATUSES = ["draft", "sent", "approved", "rejected", "expired"];
export const PROPOSAL_STATUS_LABELS = {
  draft: "Draft",
  sent: "Sent",
  approved: "Approved",
  rejected: "Rejected",
  expired: "Expired",
};

export const PROPOSAL_TYPES = [
  { value: "residential", label: "Residential" },
  { value: "gc_prime", label: "GC / Prime Contractor" },
  { value: "commercial", label: "Commercial" },
  { value: "public_municipal", label: "Public / Municipal" },
];

export const PROJECT_CATEGORIES = [
  "Driveway",
  "Patio",
  "Walkway",
  "Sidewalk",
  "Slab",
  "Foundation",
  "Curb/gutter",
  "ADA ramp",
  "Stamped/decorative concrete",
  "Concrete removal/repair",
  "Other",
];

export const LINE_ITEM_UNITS = ["LS", "SF", "SY", "LF", "CY", "EA", "HR", "DAY", "TON"];

export const LAST_YARD_COMPANY_DEFAULTS = {
  companyName: "Last Yard Concrete LLC",
  phone: "(541) 285-1060",
  email: "jacobbrown@ly-cs.com",
  location: "Albany, Oregon",
  serviceArea: "Linn, Marion, and Benton County, OR",
  licenseText: "Licensed, Bonded & Insured",
  ccb: "CCB #247389",
  tagline: "Solid Work. Stunning Results. Every Yard Counts.",
  logoDataUrl: "",
  badgeDataUrl: "",
  defaultExpirationDays: 30,
  defaultPaymentTerms: "Payment terms to be defined per project. Deposit, progress billing, retainage, or balance due terms may be adjusted in writing before work begins.",
  defaultExclusions: [
    "Permits unless specifically stated.",
    "Engineering unless specifically stated.",
    "Utility locating unless specifically stated.",
    "Unsuitable subgrade correction unless listed.",
    "Additional excavation/export unless listed.",
    "Work outside listed scope.",
  ],
  defaultWarrantyNote: "Warranty terms are project-specific and subject to normal concrete industry limitations, weather, site conditions, owner maintenance, and work outside Last Yard Concrete LLC control.",
  defaultSignatureBlock: "Accepted by the authorized owner, client, GC, or representative listed below.",
};

export const DEFAULT_TERMS = [
  "Proposal valid for 30 days unless otherwise noted.",
  "Schedule subject to weather, site readiness, material availability, and coordination with other trades.",
  "Changes to scope, quantities, grades, access, site conditions, or specifications may require written change order approval.",
  "Owner/GC is responsible for marking/identifying private utilities unless otherwise stated.",
  "Last Yard Concrete LLC is licensed, bonded, and insured.",
  "Payment terms to be defined per project.",
].join("\n");

export const DEFAULT_ASSUMPTIONS = [
  "Work area will be accessible for crew, equipment, material delivery, and concrete trucks unless noted otherwise.",
  "Proposal is based on the listed scope, quantities, assumptions, exclusions, and site information available at the time of proposal.",
  "Weather, site readiness, inspections, material availability, and other trades may affect schedule.",
];

export const DEFAULT_SCOPE_TEMPLATES = [
  {
    title: "Mobilization & Site Preparation",
    body: "Provide labor, coordination, layout support, and project setup for the concrete scope described in this proposal.",
    bullets: [
      "Site layout and coordination",
      "Protection of adjacent areas as needed",
      "Demo/removal if included",
      "Subgrade review and preparation",
    ],
  },
  {
    title: "Forms, Base & Reinforcement",
    body: "Prepare forms, base, and reinforcement items included in the listed scope and project requirements.",
    bullets: [
      "Forming to project layout",
      "Base rock placement/compaction if included",
      "Reinforcement per scope/specifications",
      "Dowels, thickened edges, or special details if included",
    ],
  },
  {
    title: "Concrete Placement",
    body: "Place, finish, joint, and cure concrete according to the proposal details and applicable project requirements.",
    bullets: [
      "Concrete placement and finishing",
      "Mix design/PSI/slump/fiber/color fields if applicable",
      "Control joints / saw cuts as applicable",
      "Cure method if applicable",
    ],
  },
  {
    title: "Decorative / Stamped Finish",
    body: "Decorative concrete elements are included only when selected or described in the proposal details.",
    bullets: ["Pattern", "Color", "Release color", "Sealer", "Special finish notes"],
  },
  {
    title: "Cleanup & Closeout",
    body: "Complete project cleanup, closeout coordination, and final review items included in the scope.",
    bullets: [
      "Jobsite cleanup",
      "Debris removal if included",
      "Final walkthrough",
      "Photo documentation if applicable",
    ],
  },
  {
    title: "Exclusions / Not Included",
    body: "Items below are not included unless specifically stated elsewhere in this proposal.",
    bullets: [
      "Permits unless specifically stated",
      "Engineering unless specifically stated",
      "Utility locating unless specifically stated",
      "Unsuitable subgrade correction unless listed",
      "Additional excavation/export unless listed",
      "Work outside listed scope",
    ],
  },
];

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function padProposalSequence(value) {
  return String(value).padStart(4, "0");
}

function toInputDate(date) {
  const source = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
  const local = new Date(source.getTime() - source.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function todayInputDate() {
  return toInputDate(new Date());
}

export function addDaysInputDate(dateString, days) {
  const parsed = dateString ? new Date(`${dateString}T12:00:00`) : new Date();
  const source = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  source.setDate(source.getDate() + Number(days || 0));
  return toInputDate(source);
}

export function createProposalId(prefix = "lyc-proposal") {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function getProposalYear(dateString = todayInputDate()) {
  const parsed = String(dateString || "").slice(0, 4);
  return /^\d{4}$/.test(parsed) ? parsed : String(new Date().getFullYear());
}

export function getNextProposalNumber(proposals = [], dateString = todayInputDate()) {
  const year = getProposalYear(dateString);
  const prefix = `LYC-${year}-`;
  const maxSequence = (Array.isArray(proposals) ? proposals : []).reduce((max, proposal) => {
    const value = String(proposal?.proposalNumber || "");
    if (!value.startsWith(prefix)) return max;
    const parsed = Number(value.slice(prefix.length));
    return Number.isFinite(parsed) ? Math.max(max, parsed) : max;
  }, 0);

  return `${prefix}${padProposalSequence(maxSequence + 1)}`;
}

export function proposalStatusLabel(status = "draft") {
  return PROPOSAL_STATUS_LABELS[String(status || "draft").trim().toLowerCase()] || "Draft";
}

export function proposalTypeLabel(type = "residential") {
  return PROPOSAL_TYPES.find((option) => option.value === type)?.label || "Residential";
}

export function roundCurrency(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export function parseNumber(value, fallback = 0) {
  if (value == null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(Number(value)) ? Number(value) : 0);
}

export function formatDate(dateString) {
  if (!dateString) return "Not set";
  const parsed = new Date(`${dateString}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return String(dateString);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

export function calculateProposalLineTotal(item = {}) {
  const quantity = parseNumber(item.quantity, 0);
  const unitPrice = parseNumber(item.unitPrice, 0);
  if (quantity < 0 || unitPrice < 0) return 0;
  return roundCurrency(quantity * unitPrice);
}

export function calculateProposalTotals(lineItems = [], options = {}) {
  const safeItems = Array.isArray(lineItems) ? lineItems : [];
  const subtotal = roundCurrency(safeItems.reduce((sum, item) => sum + calculateProposalLineTotal(item), 0));
  const taxableSubtotal = roundCurrency(
    safeItems.reduce((sum, item) => sum + (item?.taxable ? calculateProposalLineTotal(item) : 0), 0),
  );
  const taxRate = options.taxRate == null || options.taxRate === "" ? null : parseNumber(options.taxRate, null);
  const safeTaxRate = Number.isFinite(taxRate) && taxRate >= 0 ? taxRate : null;
  const taxAmount = safeTaxRate == null ? 0 : roundCurrency(taxableSubtotal * (safeTaxRate / 100));
  const discountAmount = Math.max(0, parseNumber(options.discountAmount, 0));
  const total = roundCurrency(Math.max(0, subtotal + taxAmount - discountAmount));
  const depositAmount = Math.max(0, parseNumber(options.depositAmount, 0));
  const balanceDue = roundCurrency(Math.max(0, total - depositAmount));

  return {
    subtotal,
    taxableSubtotal,
    taxRate: safeTaxRate,
    taxAmount,
    discountAmount: roundCurrency(discountAmount),
    total,
    depositAmount: roundCurrency(depositAmount),
    balanceDue,
  };
}

export function createLineItem(overrides = {}, index = 0) {
  return {
    id: overrides.id || createProposalId("lyc-line"),
    itemNumber: overrides.itemNumber || String(index + 1),
    description: overrides.description || "",
    quantity: overrides.quantity ?? 1,
    unit: overrides.unit || "LS",
    unitPrice: overrides.unitPrice ?? "",
    taxable: Boolean(overrides.taxable),
    internalCost: overrides.internalCost ?? "",
    notes: overrides.notes || "",
  };
}

export function createScopeSection(overrides = {}) {
  return {
    id: overrides.id || createProposalId("lyc-scope"),
    title: overrides.title || "",
    body: overrides.body || "",
    bullets: Array.isArray(overrides.bullets) ? overrides.bullets.filter(Boolean) : [],
  };
}

export function createPhotoSlot(overrides = {}, index = 0) {
  return {
    id: overrides.id || createProposalId("lyc-photo"),
    label: overrides.label || `Project photo ${index + 1}`,
    dataUrl: overrides.dataUrl || "",
  };
}

function normalizeStringArray(value, fallback = []) {
  const source = Array.isArray(value) ? value : fallback;
  return source.map((item) => String(item || "").trim()).filter(Boolean);
}

function normalizeLineItems(value) {
  const items = Array.isArray(value) && value.length > 0 ? value : [createLineItem()];
  return items.map((item, index) => createLineItem({
    ...item,
    itemNumber: item?.itemNumber || String(index + 1),
  }, index));
}

function normalizeScopeSections(value) {
  const sections = Array.isArray(value) && value.length > 0
    ? value
    : DEFAULT_SCOPE_TEMPLATES.slice(0, 5);
  return sections.map((section) => createScopeSection(section));
}

export function normalizeProposal(source = {}, companyDefaults = LAST_YARD_COMPANY_DEFAULTS) {
  const now = new Date().toISOString();
  const proposalDate = source.proposalDate || todayInputDate();
  const company = {
    ...LAST_YARD_COMPANY_DEFAULTS,
    ...(isRecord(companyDefaults) ? companyDefaults : {}),
    ...(isRecord(source.company) ? source.company : {}),
  };
  const lineItems = normalizeLineItems(source.lineItems);
  const totals = calculateProposalTotals(lineItems, {
    taxRate: source.taxRate,
    discountAmount: source.discountAmount,
    depositAmount: source.depositAmount,
  });

  return {
    id: source.id || createProposalId(),
    proposalNumber: source.proposalNumber || "LYC-2026-0001",
    status: PROPOSAL_STATUSES.includes(source.status) ? source.status : "draft",
    proposalType: PROPOSAL_TYPES.some((option) => option.value === source.proposalType) ? source.proposalType : "residential",
    proposalDate,
    expirationDate: source.expirationDate || addDaysInputDate(proposalDate, company.defaultExpirationDays || 30),
    company,
    client: {
      companyName: source.client?.companyName || "",
      contactName: source.client?.contactName || "",
      phone: source.client?.phone || "",
      email: source.client?.email || "",
      billingAddress: source.client?.billingAddress || "",
      projectAddress: source.client?.projectAddress || "",
    },
    gcPrime: {
      contractorName: source.gcPrime?.contractorName || "",
      projectManagerName: source.gcPrime?.projectManagerName || "",
      projectManagerPhone: source.gcPrime?.projectManagerPhone || "",
      projectManagerEmail: source.gcPrime?.projectManagerEmail || "",
      bidPackageNumber: source.gcPrime?.bidPackageNumber || "",
      specSection: source.gcPrime?.specSection || "",
      drawingReferences: source.gcPrime?.drawingReferences || "",
      addendaAcknowledged: normalizeStringArray(source.gcPrime?.addendaAcknowledged),
      retainagePercent: source.gcPrime?.retainagePercent ?? "",
      prevailingWageRequired: Boolean(source.gcPrime?.prevailingWageRequired),
      certifiedPayrollRequired: Boolean(source.gcPrime?.certifiedPayrollRequired),
      insuranceCertificateRequired: Boolean(source.gcPrime?.insuranceCertificateRequired),
      w9Required: Boolean(source.gcPrime?.w9Required),
      safetyOrientationRequired: Boolean(source.gcPrime?.safetyOrientationRequired),
      jobsiteAccessRequirements: source.gcPrime?.jobsiteAccessRequirements || "",
      paymentApplicationTerms: source.gcPrime?.paymentApplicationTerms || "",
      changeOrderProcess: source.gcPrime?.changeOrderProcess || "",
      rfiNotes: source.gcPrime?.rfiNotes || "",
    },
    project: {
      name: source.project?.name || "",
      location: source.project?.location || "",
      description: source.project?.description || "",
      category: source.project?.category || "Driveway",
      estimatedStartDate: source.project?.estimatedStartDate || "",
      estimatedDuration: source.project?.estimatedDuration || "",
      accessNotes: source.project?.accessNotes || "",
      siteConditionNotes: source.project?.siteConditionNotes || "",
      scheduleRestrictions: source.project?.scheduleRestrictions || "",
      specialRequirements: source.project?.specialRequirements || "",
    },
    concreteSpecs: {
      squareFeet: source.concreteSpecs?.squareFeet ?? "",
      cubicYards: source.concreteSpecs?.cubicYards ?? "",
      thicknessInches: source.concreteSpecs?.thicknessInches ?? "",
      psi: source.concreteSpecs?.psi || "",
      slump: source.concreteSpecs?.slump || "",
      airEntrapment: source.concreteSpecs?.airEntrapment || "",
      fiberMesh: source.concreteSpecs?.fiberMesh ?? null,
      reinforcement: source.concreteSpecs?.reinforcement || "",
      finishType: source.concreteSpecs?.finishType || "",
      controlJointSpacing: source.concreteSpecs?.controlJointSpacing || "",
      sawCutTiming: source.concreteSpecs?.sawCutTiming || "",
      cureSealerNotes: source.concreteSpecs?.cureSealerNotes || "",
      supplier: source.concreteSpecs?.supplier || "",
      pumpRequired: source.concreteSpecs?.pumpRequired ?? null,
      truckAccessNotes: source.concreteSpecs?.truckAccessNotes || "",
    },
    scopeSections: normalizeScopeSections(source.scopeSections),
    lineItems,
    exclusions: normalizeStringArray(source.exclusions, company.defaultExclusions),
    assumptions: normalizeStringArray(source.assumptions, DEFAULT_ASSUMPTIONS),
    terms: source.terms || DEFAULT_TERMS,
    warrantyNote: source.warrantyNote || company.defaultWarrantyNote || "",
    signatureNote: source.signatureNote || company.defaultSignatureBlock || "",
    internalNotes: source.internalNotes || "",
    projectPhotos: Array.isArray(source.projectPhotos)
      ? source.projectPhotos.map((photo, index) => createPhotoSlot(photo, index))
      : [createPhotoSlot({}, 0), createPhotoSlot({}, 1)],
    taxRate: totals.taxRate ?? "",
    discountAmount: totals.discountAmount,
    depositAmount: totals.depositAmount,
    subtotal: totals.subtotal,
    taxableSubtotal: totals.taxableSubtotal,
    taxAmount: totals.taxAmount,
    total: totals.total,
    balanceDue: totals.balanceDue,
    createdAt: source.createdAt || now,
    updatedAt: source.updatedAt || now,
  };
}

export function createBlankProposal(existingProposals = [], companyDefaults = LAST_YARD_COMPANY_DEFAULTS) {
  const proposalDate = todayInputDate();
  return normalizeProposal({
    proposalNumber: getNextProposalNumber(existingProposals, proposalDate),
    proposalDate,
    expirationDate: addDaysInputDate(proposalDate, companyDefaults.defaultExpirationDays || 30),
    status: "draft",
    proposalType: "residential",
    company: companyDefaults,
    scopeSections: DEFAULT_SCOPE_TEMPLATES.slice(0, 5),
    lineItems: [createLineItem({ description: "Concrete scope", quantity: 1, unit: "LS", unitPrice: "" })],
    exclusions: companyDefaults.defaultExclusions,
    assumptions: DEFAULT_ASSUMPTIONS,
    terms: DEFAULT_TERMS,
  }, companyDefaults);
}

export function createSeedProposal(companyDefaults = LAST_YARD_COMPANY_DEFAULTS) {
  return normalizeProposal({
    id: "lyc-proposal-seed-gc-sidewalk",
    proposalNumber: "LYC-2026-0001",
    status: "draft",
    proposalType: "gc_prime",
    proposalDate: "2026-05-02",
    expirationDate: "2026-06-01",
    company: companyDefaults,
    client: {
      companyName: "Example Prime Contractors LLC",
      contactName: "Estimating Department",
      phone: "(541) 555-0142",
      email: "estimating@example-prime.test",
      billingAddress: "1200 Builder Way, Albany, OR 97321",
      projectAddress: "Albany Commercial Sidewalk Replacement, Albany, OR",
    },
    gcPrime: {
      contractorName: "Example Prime Contractors LLC",
      projectManagerName: "Taylor Morgan",
      projectManagerPhone: "(541) 555-0188",
      projectManagerEmail: "tmorgan@example-prime.test",
      bidPackageNumber: "BP-03C",
      specSection: "03 30 00 Cast-in-Place Concrete",
      drawingReferences: "C2.1 Site Demo, C4.0 Concrete Flatwork, A1.2 ADA Details",
      addendaAcknowledged: ["Addendum 01", "Addendum 02"],
      retainagePercent: 5,
      prevailingWageRequired: false,
      certifiedPayrollRequired: false,
      insuranceCertificateRequired: true,
      w9Required: true,
      safetyOrientationRequired: true,
      jobsiteAccessRequirements: "Coordinate site access, staging, and sidewalk closures with the GC superintendent before mobilization.",
      paymentApplicationTerms: "Monthly progress billing per GC payment application schedule.",
      changeOrderProcess: "Work outside this proposal shall be handled by written change order before proceeding.",
      rfiNotes: "ADA transitions, tie-ins, and grade conflicts to be clarified before placement.",
    },
    project: {
      name: "Albany Commercial Sidewalk Replacement",
      location: "Albany, Oregon",
      description: "Remove and replace commercial sidewalk panels with ADA-conscious layout, broom finish, saw cuts, and cleanup.",
      category: "Sidewalk",
      estimatedStartDate: "2026-06-10",
      estimatedDuration: "4 working days",
      accessNotes: "Truck access required from the east service drive with staging coordinated by GC.",
      siteConditionNotes: "Existing sidewalk panels to be removed; unsuitable subgrade correction excluded unless listed.",
      scheduleRestrictions: "Work to be coordinated around business access and GC phasing.",
      specialRequirements: "ADA compliance notes apply to slopes, transitions, and tie-ins shown in project documents.",
    },
    concreteSpecs: {
      squareFeet: 350,
      cubicYards: 4.5,
      thicknessInches: 4,
      psi: "3500 PSI",
      slump: "Per supplier/project conditions",
      airEntrapment: "Exterior flatwork mix as applicable",
      fiberMesh: false,
      reinforcement: "Reinforcement only where shown or directed in scope",
      finishType: "Broom finish",
      controlJointSpacing: "Control joints/saw cuts as applicable to layout",
      sawCutTiming: "Saw cut timing based on set time and field conditions",
      cureSealerNotes: "Cure/sealer per project direction if required",
      supplier: "Local ready-mix supplier, final supplier TBD",
      pumpRequired: false,
      truckAccessNotes: "Ready-mix truck access required adjacent to work zone where feasible.",
    },
    scopeSections: [
      {
        title: "Demo Existing Sidewalk",
        body: "Remove existing sidewalk panels in the identified replacement area and prepare the work zone for new concrete flatwork.",
        bullets: ["Saw cut/demo existing sidewalk as required", "Load and haul off concrete debris", "Protect adjacent areas as practical"],
      },
      {
        title: "Subgrade, Forms & Base Preparation",
        body: "Review subgrade, set forms, and prepare base conditions for new sidewalk placement.",
        bullets: ["Prepare subgrade for placement", "Form to project layout and tie-ins", "Base rock placement/compaction if included"],
      },
      {
        title: "Place and Finish Concrete Sidewalk",
        body: "Place 4-inch 3500 PSI concrete sidewalk with broom finish, ADA-conscious transitions, and control joints/saw cuts.",
        bullets: ["Place concrete sidewalk panels", "Broom finish for pedestrian traction", "Control joints and saw cuts as applicable", "ADA compliance notes for transitions and slopes"],
      },
      {
        title: "Cleanup & Closeout",
        body: "Clean work area, remove included debris, and coordinate closeout with GC representative.",
        bullets: ["Jobsite cleanup", "Final walkthrough", "Photo documentation if applicable"],
      },
    ],
    lineItems: [
      createLineItem({ description: "Mobilization", quantity: 1, unit: "LS", unitPrice: 650 }, 0),
      createLineItem({ description: "Demo and haul-off", quantity: 350, unit: "SF", unitPrice: 4.75 }, 1),
      createLineItem({ description: "Form/prep/base", quantity: 350, unit: "SF", unitPrice: 5.25 }, 2),
      createLineItem({ description: "Place and finish concrete sidewalk", quantity: 350, unit: "SF", unitPrice: 12.5 }, 3),
      createLineItem({ description: "Cleanup/closeout", quantity: 1, unit: "LS", unitPrice: 450 }, 4),
    ],
    exclusions: [
      "Permits, engineering, testing, and inspection fees unless specifically stated.",
      "Private utility locating, relocation, or repairs.",
      "Unsuitable subgrade correction, over-excavation, import/export, or dewatering unless listed as a line item.",
      "Work outside listed sidewalk replacement scope.",
    ],
    assumptions: [
      "Proposal is based on listed scope, drawings, specifications, and addenda acknowledged herein.",
      "GC to provide clear access, staging, and business/customer access coordination.",
      "ADA tie-ins are based on available field conditions and project documents.",
    ],
    terms: [
      "Proposal valid for 30 days unless otherwise noted.",
      "Schedule is subject to weather, site readiness, material availability, and coordination with other trades.",
      "Changes to scope, quantities, grades, access, site conditions, or specifications may require written change order approval.",
      "Owner/GC is responsible for marking/identifying private utilities unless otherwise stated.",
      "Last Yard Concrete LLC is licensed, bonded, and insured.",
      "Payment terms to be defined per project or GC contract requirements.",
    ].join("\n"),
  }, companyDefaults);
}

export function duplicateProposal(proposal, existingProposals = [], companyDefaults = LAST_YARD_COMPANY_DEFAULTS) {
  const proposalDate = todayInputDate();
  return normalizeProposal({
    ...proposal,
    id: createProposalId(),
    proposalNumber: getNextProposalNumber(existingProposals, proposalDate),
    status: "draft",
    proposalDate,
    expirationDate: addDaysInputDate(proposalDate, proposal?.company?.defaultExpirationDays || companyDefaults.defaultExpirationDays || 30),
    project: {
      ...(proposal?.project || {}),
      name: `${proposal?.project?.name || "Concrete Proposal"} Copy`,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }, companyDefaults);
}

export function filterProposals(proposals = [], filters = {}) {
  const status = filters.status || "All";
  const search = String(filters.search || "").trim().toLowerCase();
  return (Array.isArray(proposals) ? proposals : [])
    .map((proposal) => normalizeProposal(proposal))
    .filter((proposal) => {
      if (status !== "All" && proposalStatusLabel(proposal.status) !== status) return false;
      if (!search) return true;
      const haystack = [
        proposal.proposalNumber,
        proposal.status,
        proposal.client.companyName,
        proposal.client.contactName,
        proposal.client.phone,
        proposal.client.email,
        proposal.gcPrime.contractorName,
        proposal.gcPrime.projectManagerName,
        proposal.project.name,
        proposal.project.location,
        proposal.project.category,
        proposal.project.description,
      ].join(" ").toLowerCase();
      return haystack.includes(search);
    });
}

function hasMeaningfulValue(value) {
  if (value == null) return false;
  if (typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  return String(value).trim() !== "";
}

export function concreteSpecRows(concreteSpecs = {}) {
  const rows = [
    ["Estimated square feet", concreteSpecs.squareFeet ? `${concreteSpecs.squareFeet} SF` : ""],
    ["Estimated cubic yards", concreteSpecs.cubicYards ? `${concreteSpecs.cubicYards} CY` : ""],
    ["Thickness", concreteSpecs.thicknessInches ? `${concreteSpecs.thicknessInches} in` : ""],
    ["PSI", concreteSpecs.psi],
    ["Slump", concreteSpecs.slump],
    ["Air entrainment", concreteSpecs.airEntrapment],
    ["Fiber mesh", typeof concreteSpecs.fiberMesh === "boolean" ? (concreteSpecs.fiberMesh ? "Yes" : "No") : ""],
    ["Rebar/mesh details", concreteSpecs.reinforcement],
    ["Finish type", concreteSpecs.finishType],
    ["Control joint spacing", concreteSpecs.controlJointSpacing],
    ["Saw cut timing", concreteSpecs.sawCutTiming],
    ["Cure/sealer notes", concreteSpecs.cureSealerNotes],
    ["Concrete supplier", concreteSpecs.supplier],
    ["Pump required", typeof concreteSpecs.pumpRequired === "boolean" ? (concreteSpecs.pumpRequired ? "Yes" : "No") : ""],
    ["Truck access notes", concreteSpecs.truckAccessNotes],
  ];

  return rows.filter(([, value]) => hasMeaningfulValue(value));
}

export function hasConcreteSpecs(concreteSpecs = {}) {
  return concreteSpecRows(concreteSpecs).length > 0;
}

export function proposalIntroCopy(type = "residential") {
  if (type === "gc_prime") {
    return "Last Yard Concrete LLC is pleased to submit this proposal for the concrete scope identified below. This proposal is based on the listed scope, assumptions, exclusions, drawings, specifications, and addenda acknowledged herein. Any work outside this scope shall be handled by written change order.";
  }
  if (type === "commercial" || type === "public_municipal") {
    return "Last Yard Concrete LLC is prepared to provide professional concrete services for the project listed below, with clear scope, schedule coordination, durable workmanship, and clean closeout.";
  }
  return "Last Yard Concrete LLC is prepared to provide professional concrete services for the project listed below. Our team focuses on durable workmanship, clean finishes, and clear communication from layout through final cleanup.";
}

export function validateProposal(proposal = {}) {
  const normalized = normalizeProposal(proposal);
  const errors = [];
  const warnings = [];
  if (!normalized.client.companyName && !normalized.client.contactName) {
    errors.push("Client/company or contact name is required.");
  }
  if (!normalized.project.name) errors.push("Project name is required.");
  if (!normalized.client.projectAddress && !normalized.project.location) {
    errors.push("Project address or location is required.");
  }
  if (!normalized.scopeSections.some((section) => section.title || section.body || section.bullets.length)) {
    errors.push("At least one scope section is required.");
  }
  if (!normalized.lineItems.some((item) => item.description || parseNumber(item.unitPrice, 0) > 0)) {
    errors.push("At least one line item is required.");
  }
  if (!normalized.proposalDate) errors.push("Proposal date is required.");
  if (!normalized.expirationDate) errors.push("Expiration date is required.");

  if (!normalized.client.email) warnings.push("Client email is missing.");
  if (!normalized.client.phone) warnings.push("Client phone is missing.");
  if (normalized.exclusions.length === 0) warnings.push("No exclusions are listed.");
  if (!normalized.terms) warnings.push("Terms are missing.");
  if (!hasConcreteSpecs(normalized.concreteSpecs)) warnings.push("Concrete specs are not filled in.");

  return { errors, warnings };
}
