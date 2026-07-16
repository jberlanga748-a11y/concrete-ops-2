export const DEFAULT_ESTIMATE_PACKET_PRESET_ID = "customerProposalPacket";
export const INTERNAL_REVIEW_PACKET_PRESET_ID = "internalReviewPacket";
export const DEFAULT_ESTIMATE_PACKET_THEME_ID = "safety-orange";
export const CUSTOM_ESTIMATE_PACKET_THEME_ID = "custom-brand";

export const ESTIMATE_PACKET_THEME_OPTIONS = [
  {
    id: DEFAULT_ESTIMATE_PACKET_THEME_ID,
    label: "Safety Orange",
    headerColor: "#07111f",
    headerTextColor: "#ffffff",
    accentColor: "#f97316",
    accentDarkColor: "#9a3412",
    accentSoftColor: "#fff7ed",
  },
  {
    id: "blueprint-blue",
    label: "Blueprint Blue",
    headerColor: "#0f2742",
    headerTextColor: "#ffffff",
    accentColor: "#2563eb",
    accentDarkColor: "#1d4ed8",
    accentSoftColor: "#eff6ff",
  },
  {
    id: "field-green",
    label: "Field Green",
    headerColor: "#10281d",
    headerTextColor: "#ffffff",
    accentColor: "#15803d",
    accentDarkColor: "#166534",
    accentSoftColor: "#f0fdf4",
  },
  {
    id: "charcoal-gold",
    label: "Charcoal Gold",
    headerColor: "#18181b",
    headerTextColor: "#ffffff",
    accentColor: "#d97706",
    accentDarkColor: "#92400e",
    accentSoftColor: "#fffbeb",
  },
  {
    id: CUSTOM_ESTIMATE_PACKET_THEME_ID,
    label: "Custom Brand",
    headerColor: "#07111f",
    headerTextColor: "#ffffff",
    accentColor: "#f97316",
    accentDarkColor: "#9a3412",
    accentSoftColor: "#fff7ed",
    custom: true,
  },
];

export const ESTIMATE_PACKET_COPY_TEMPLATE_OPTIONS = [
  {
    id: "residential-homeowner",
    label: "Residential Homeowner",
    presetIds: ["residentialProposalPacket"],
    customization: {
      coverKicker: "Residential Proposal",
      coverTitle: "Homeowner Proposal",
      tagline: "Clear scope. Clean finish. Built for your home.",
      statementTitle: "Ready for homeowner review.",
      statementBody: "Scope, pricing choices, terms, warranty notes, and next steps are organized so the homeowner can approve with confidence.",
      reviewNote: "Confirm scope, finish, payment terms, and schedule before approval.",
    },
  },
  {
    id: "residential-premium",
    label: "Premium Residential",
    presetIds: ["residentialProposalPacket"],
    customization: {
      coverKicker: "Premium Concrete Proposal",
      coverTitle: "Residential Finish Package",
      tagline: "A polished proposal for finish, durability, and clean handoff.",
      statementTitle: "Built for a smooth homeowner decision.",
      statementBody: "Recommended options, allowances, exclusions, warranty notes, and approval details are presented in one professional homeowner packet.",
      reviewNote: "Review selected options, finish references, and final approval steps.",
    },
  },
  {
    id: "gc-prime-award",
    label: "GC Award Review",
    presetIds: ["gcPrimeProposalPacket"],
    customization: {
      coverKicker: "Concrete Bid",
      coverTitle: "Prime Bid Package",
      tagline: "Clear scope. Professional terms. Ready for GC review.",
      statementTitle: "Ready for award review.",
      statementBody: "Scope, alternates, terms, exclusions, and closeout expectations are organized for the GC team.",
      reviewNote: "Confirm addenda, inclusions, and schedule assumptions before award.",
    },
  },
  {
    id: "commercial-subcontractor",
    label: "Commercial Subcontractor",
    presetIds: ["commercialSubcontractorPacket", "commercialProposal"],
    customization: {
      coverKicker: "Subcontractor Proposal",
      coverTitle: "Commercial Sub Bid",
      tagline: "Scope boundaries, coordination notes, and billing terms ready for review.",
      statementTitle: "Ready for subcontract review.",
      statementBody: "Qualifications, schedule coordination, alternates, exclusions, and billing terms are organized for the project team.",
      reviewNote: "Confirm scope limits, addenda, access, and billing terms before award.",
    },
  },
  {
    id: "internal-estimate-review",
    label: "Internal Estimate Review",
    presetIds: [INTERNAL_REVIEW_PACKET_PRESET_ID],
    customization: {
      coverKicker: "Office Review Packet",
      coverTitle: "Internal Bid Review",
      tagline: "Estimator backup, scope checks, risks, and handoff notes for office use.",
      statementTitle: "Ready for office review.",
      statementBody: "Scope, pricing summary, SOV backup, takeoff references, internal notes, and review risks are organized for the office team before customer release.",
      reviewNote: "Office-only packet. Do not send to customers or field crews.",
    },
  },
];

export const ESTIMATE_PACKET_SECTION_DEFS = [
  {
    id: "projectInfo",
    label: "Project / customer information",
    description: "Customer, project, status, and created date.",
  },
  {
    id: "estimateSummary",
    label: "Estimate summary",
    description: "Line items, base estimate total, tax, and fees.",
  },
  {
    id: "scopeOfWork",
    label: "Scope of work",
    description: "Customer-facing work summary.",
  },
  {
    id: "inclusions",
    label: "Inclusions",
    description: "What is included in the proposal.",
  },
  {
    id: "exclusions",
    label: "Exclusions",
    description: "What is excluded from the proposal.",
  },
  {
    id: "assumptions",
    label: "Assumptions / clarifications",
    description: "Customer-facing clarifications and bid assumptions.",
  },
  {
    id: "proposalCoverNote",
    label: "Proposal cover note",
    description: "GC-facing introduction or cover note.",
  },
  {
    id: "proposalSummary",
    label: "Proposal summary",
    description: "GC-facing commercial proposal summary.",
  },
  {
    id: "qualifications",
    label: "Qualifications",
    description: "Customer-facing bid qualifications.",
  },
  {
    id: "scheduleNotes",
    label: "Schedule notes",
    description: "Customer-facing schedule assumptions.",
  },
  {
    id: "addendaRfiReferences",
    label: "Addenda / RFI references",
    description: "Addenda, RFI, and plan references.",
  },
  {
    id: "projectEvidence",
    label: "Project evidence / takeoff summary",
    description: "Customer-safe photos, references, and takeoff quantities without internal backup notes.",
  },
  {
    id: "concreteSpecifications",
    label: "Project specifications",
    description: "Materials, finish, supplier, and technical specification notes.",
  },
  {
    id: "alternatesAddOns",
    label: "Alternates / optional add-ons",
    description: "Proposal options and selected-options review totals.",
  },
  {
    id: "pricingOptions",
    label: "Choose-one pricing options",
    description: "Residential-style or package-style options where the customer selects one base option.",
  },
  {
    id: "optionPhotoPages",
    label: "Option / finish references",
    description: "Customer-safe option images, captions, and visual references.",
  },
  {
    id: "customerNotesTerms",
    label: "Customer notes / terms",
    description: "Customer-facing notes, terms, and proposal validity.",
  },
  {
    id: "paymentTerms",
    label: "Payment terms",
    description: "Deposit, billing, progress payment, retainage, and final payment terms.",
  },
  {
    id: "warrantyNotes",
    label: "Warranty / workmanship notes",
    description: "Customer-facing warranty, workmanship, and concrete limitation notes.",
  },
  {
    id: "acceptanceNextSteps",
    label: "Acceptance / next steps",
    description: "Approval instructions, signature reminders, and next-step coordination.",
  },
  {
    id: "legalNotices",
    label: "Residential legal notices",
    description: "Residential notices, owner responsibilities, lien notice reminders, and right-to-cancel notes.",
  },
  {
    id: "customerApproval",
    label: "Customer approval record",
    description: "Customer selection, signature, acknowledgements, accepted total, and approval notes.",
  },
  {
    id: "sovBackup",
    label: "SOV backup",
    description: "Office-only schedule of values backup.",
    internalOnly: true,
  },
  {
    id: "takeoffBackup",
    label: "Takeoff backup",
    description: "Office-only quantity and takeoff backup.",
    internalOnly: true,
  },
  {
    id: "referenceAttachments",
    label: "Reference attachments",
    description: "Office-only plan, photo, Bluebeam, and takeoff reference files.",
    internalOnly: true,
  },
  {
    id: "internalReviewNotes",
    label: "Internal review notes",
    description: "Office-only internal notes, GC review notes, and backup notes.",
    internalOnly: true,
  },
];

export const ESTIMATE_PACKET_PRESETS = [
  {
    id: "polishedEstimateSheet",
    label: "Polished Estimate Sheet",
    description: "Compact customer estimate with project identity, clear scope, pricing summary, evidence, options, and terms.",
    sectionIds: [
      "projectInfo",
      "estimateSummary",
      "scopeOfWork",
      "inclusions",
      "exclusions",
      "assumptions",
      "projectEvidence",
      "concreteSpecifications",
      "alternatesAddOns",
      "pricingOptions",
      "customerNotesTerms",
      "paymentTerms",
      "warrantyNotes",
      "acceptanceNextSteps",
    ],
  },
  {
    id: "basicEstimate",
    label: "Basic Estimate",
    description: "Clean customer estimate with scope, terms, pricing, and options.",
    sectionIds: [
      "projectInfo",
      "estimateSummary",
      "scopeOfWork",
      "inclusions",
      "exclusions",
      "assumptions",
      "projectEvidence",
      "concreteSpecifications",
      "alternatesAddOns",
      "pricingOptions",
      "customerNotesTerms",
      "paymentTerms",
      "warrantyNotes",
      "acceptanceNextSteps",
    ],
  },
  {
    id: "customerProposalPacket",
    label: "Customer Proposal Packet",
    description: "Customer-ready proposal packet with branded cover, scope, qualifications, schedule notes, evidence, options, and terms.",
    sectionIds: [
      "projectInfo",
      "estimateSummary",
      "scopeOfWork",
      "inclusions",
      "exclusions",
      "assumptions",
      "proposalCoverNote",
      "proposalSummary",
      "qualifications",
      "scheduleNotes",
      "projectEvidence",
      "concreteSpecifications",
      "alternatesAddOns",
      "pricingOptions",
      "optionPhotoPages",
      "customerNotesTerms",
      "paymentTerms",
      "warrantyNotes",
      "acceptanceNextSteps",
    ],
  },
  {
    id: "residentialProposalPacket",
    label: "Residential Proposal Packet",
    description: "Homeowner-friendly proposal with clear scope, pricing, warranty notes, payment terms, and acceptance next steps.",
    sectionIds: [
      "projectInfo",
      "estimateSummary",
      "scopeOfWork",
      "inclusions",
      "exclusions",
      "assumptions",
      "projectEvidence",
      "concreteSpecifications",
      "alternatesAddOns",
      "pricingOptions",
      "optionPhotoPages",
      "customerNotesTerms",
      "paymentTerms",
      "warrantyNotes",
      "acceptanceNextSteps",
      "legalNotices",
      "customerApproval",
    ],
  },
  {
    id: "commercialSubcontractorPacket",
    label: "Commercial Subcontractor Packet",
    description: "Commercial subcontractor proposal with qualifications, schedule coordination, scope boundaries, options, and billing terms.",
    sectionIds: [
      "projectInfo",
      "estimateSummary",
      "scopeOfWork",
      "inclusions",
      "exclusions",
      "assumptions",
      "qualifications",
      "scheduleNotes",
      "projectEvidence",
      "concreteSpecifications",
      "alternatesAddOns",
      "pricingOptions",
      "optionPhotoPages",
      "customerNotesTerms",
      "paymentTerms",
      "warrantyNotes",
      "acceptanceNextSteps",
    ],
  },
  {
    id: "commercialProposal",
    label: "Commercial Proposal",
    description: "Adds GC-facing qualifications and schedule notes for commercial proposal review.",
    sectionIds: [
      "projectInfo",
      "estimateSummary",
      "scopeOfWork",
      "inclusions",
      "exclusions",
      "assumptions",
      "qualifications",
      "scheduleNotes",
      "projectEvidence",
      "concreteSpecifications",
      "alternatesAddOns",
      "pricingOptions",
      "optionPhotoPages",
      "customerNotesTerms",
      "paymentTerms",
      "warrantyNotes",
      "acceptanceNextSteps",
    ],
  },
  {
    id: "gcBidPacket",
    label: "GC Bid Packet",
    description: "Customer-facing GC bid output with all safe proposal and GC packet sections.",
    sectionIds: [
      "projectInfo",
      "estimateSummary",
      "scopeOfWork",
      "inclusions",
      "exclusions",
      "assumptions",
      "proposalCoverNote",
      "proposalSummary",
      "qualifications",
      "scheduleNotes",
      "addendaRfiReferences",
      "projectEvidence",
      "concreteSpecifications",
      "alternatesAddOns",
      "pricingOptions",
      "optionPhotoPages",
      "customerNotesTerms",
      "paymentTerms",
      "warrantyNotes",
      "acceptanceNextSteps",
    ],
  },
  {
    id: "gcPrimeProposalPacket",
    label: "GC / Prime Proposal Packet",
    description: "GC/prime-facing proposal packet with addenda references, qualifications, schedule notes, alternates, and acceptance terms.",
    sectionIds: [
      "projectInfo",
      "estimateSummary",
      "scopeOfWork",
      "inclusions",
      "exclusions",
      "assumptions",
      "proposalCoverNote",
      "proposalSummary",
      "qualifications",
      "scheduleNotes",
      "addendaRfiReferences",
      "projectEvidence",
      "concreteSpecifications",
      "alternatesAddOns",
      "pricingOptions",
      "optionPhotoPages",
      "customerNotesTerms",
      "paymentTerms",
      "warrantyNotes",
      "acceptanceNextSteps",
    ],
  },
  {
    id: INTERNAL_REVIEW_PACKET_PRESET_ID,
    label: "Internal Review Packet",
    description: "Office-only review packet with customer-facing sections plus SOV, takeoff, and internal notes.",
    sectionIds: [
      "projectInfo",
      "estimateSummary",
      "scopeOfWork",
      "inclusions",
      "exclusions",
      "assumptions",
      "proposalCoverNote",
      "proposalSummary",
      "qualifications",
      "scheduleNotes",
      "addendaRfiReferences",
      "projectEvidence",
      "concreteSpecifications",
      "alternatesAddOns",
      "pricingOptions",
      "optionPhotoPages",
      "customerNotesTerms",
      "paymentTerms",
      "warrantyNotes",
      "acceptanceNextSteps",
      "sovBackup",
      "takeoffBackup",
      "referenceAttachments",
      "internalReviewNotes",
    ],
    internalOnly: true,
  },
];

const VALID_SECTION_IDS = new Set(ESTIMATE_PACKET_SECTION_DEFS.map((section) => section.id));
const INTERNAL_SECTION_IDS = new Set(
  ESTIMATE_PACKET_SECTION_DEFS.filter((section) => section.internalOnly).map((section) => section.id),
);
const THEME_BY_ID = new Map(ESTIMATE_PACKET_THEME_OPTIONS.map((theme) => [theme.id, theme]));
const DEFAULT_THEME = THEME_BY_ID.get(DEFAULT_ESTIMATE_PACKET_THEME_ID) || ESTIMATE_PACKET_THEME_OPTIONS[0];

function uniqueValidSectionIds(sectionIds = []) {
  return Array.from(new Set(Array.isArray(sectionIds) ? sectionIds : []))
    .filter((sectionId) => VALID_SECTION_IDS.has(sectionId));
}

function cleanPacketCustomizationText(value = "", maxLength = 180) {
  return String(value || "")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function normalizeHexColor(value = "") {
  const rawValue = String(value || "").trim();
  if (!rawValue) return "";
  const prefixedValue = rawValue.startsWith("#") ? rawValue : `#${rawValue}`;
  const shortMatch = prefixedValue.match(/^#([0-9A-F]{3})$/i);
  if (shortMatch) {
    return `#${shortMatch[1].split("").map((part) => `${part}${part}`).join("")}`.toLowerCase();
  }
  return /^#[0-9A-F]{6}$/i.test(prefixedValue) ? prefixedValue.toLowerCase() : "";
}

function hexToRgb(hexColor) {
  const normalizedColor = normalizeHexColor(hexColor);
  if (!normalizedColor) return null;
  return {
    r: Number.parseInt(normalizedColor.slice(1, 3), 16),
    g: Number.parseInt(normalizedColor.slice(3, 5), 16),
    b: Number.parseInt(normalizedColor.slice(5, 7), 16),
  };
}

function rgbToHex({ r, g, b }) {
  return `#${[r, g, b].map((channel) => Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, "0")).join("")}`;
}

function mixHexColor(hexColor, targetColor, targetWeight) {
  const color = hexToRgb(hexColor);
  const target = hexToRgb(targetColor);
  if (!color || !target) return normalizeHexColor(hexColor) || normalizeHexColor(targetColor);
  return rgbToHex({
    r: color.r * (1 - targetWeight) + target.r * targetWeight,
    g: color.g * (1 - targetWeight) + target.g * targetWeight,
    b: color.b * (1 - targetWeight) + target.b * targetWeight,
  });
}

function readableTextColor(hexColor) {
  const color = hexToRgb(hexColor);
  if (!color) return "#ffffff";
  const brightness = (color.r * 299 + color.g * 587 + color.b * 114) / 1000;
  return brightness > 150 ? "#07111f" : "#ffffff";
}

export function normalizeEstimatePacketCustomization(customization = {}) {
  const requestedThemeId = String(customization?.themeId || "");
  const selectedTheme = THEME_BY_ID.get(requestedThemeId) || DEFAULT_THEME;
  const useCustomTheme = requestedThemeId === CUSTOM_ESTIMATE_PACKET_THEME_ID;
  const headerColor = normalizeHexColor(customization.headerColor) || selectedTheme.headerColor;
  const accentColor = normalizeHexColor(customization.accentColor) || selectedTheme.accentColor;
  const headerTextColor = normalizeHexColor(customization.headerTextColor) || readableTextColor(headerColor);
  const accentDarkColor = normalizeHexColor(customization.accentDarkColor) || mixHexColor(accentColor, "#000000", 0.32);
  const accentSoftColor = normalizeHexColor(customization.accentSoftColor) || mixHexColor(accentColor, "#ffffff", 0.9);
  const customThemeName = cleanPacketCustomizationText(customization.customThemeName, 32);
  const theme = useCustomTheme
    ? {
      id: CUSTOM_ESTIMATE_PACKET_THEME_ID,
      label: customThemeName || "Custom Brand",
      headerColor,
      headerTextColor,
      accentColor,
      accentDarkColor,
      accentSoftColor,
      custom: true,
    }
    : selectedTheme;
  return {
    theme,
    themeId: theme.id,
    customThemeName: useCustomTheme ? customThemeName : "",
    headerColor: useCustomTheme ? theme.headerColor : "",
    headerTextColor: useCustomTheme ? theme.headerTextColor : "",
    accentColor: useCustomTheme ? theme.accentColor : "",
    coverKicker: cleanPacketCustomizationText(customization.coverKicker, 48),
    coverTitle: cleanPacketCustomizationText(customization.coverTitle, 64),
    tagline: cleanPacketCustomizationText(customization.tagline, 96),
    statementTitle: cleanPacketCustomizationText(customization.statementTitle, 72),
    statementBody: cleanPacketCustomizationText(customization.statementBody, 260),
    reviewNote: cleanPacketCustomizationText(customization.reviewNote, 120),
  };
}

export function getEstimatePacketPreset(presetId = DEFAULT_ESTIMATE_PACKET_PRESET_ID) {
  return ESTIMATE_PACKET_PRESETS.find((preset) => preset.id === presetId)
    || ESTIMATE_PACKET_PRESETS.find((preset) => preset.id === DEFAULT_ESTIMATE_PACKET_PRESET_ID)
    || ESTIMATE_PACKET_PRESETS[0];
}

export function resolveEstimatePacketSettings(settings = {}) {
  const preset = getEstimatePacketPreset(settings?.presetId);
  const requestedSectionIds = uniqueValidSectionIds(
    Array.isArray(settings?.sectionIds) && settings.sectionIds.length > 0
      ? settings.sectionIds
      : preset.sectionIds,
  );
  const allowInternalSections = Boolean(settings?.allowInternalSections)
    && preset.id === INTERNAL_REVIEW_PACKET_PRESET_ID;
  const sectionIds = requestedSectionIds.filter((sectionId) => (
    allowInternalSections || !INTERNAL_SECTION_IDS.has(sectionId)
  ));
  const includes = Object.fromEntries(
    ESTIMATE_PACKET_SECTION_DEFS.map((section) => [section.id, sectionIds.includes(section.id)]),
  );

  return {
    presetId: preset.id,
    presetLabel: preset.label,
    presetDescription: preset.description,
    sectionIds,
    allowInternalSections,
    customization: normalizeEstimatePacketCustomization(settings?.customization),
    includes,
  };
}
