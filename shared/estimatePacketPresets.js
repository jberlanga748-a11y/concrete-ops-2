export const DEFAULT_ESTIMATE_PACKET_PRESET_ID = "gcBidPacket";
export const INTERNAL_REVIEW_PACKET_PRESET_ID = "internalReviewPacket";

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
    id: "alternatesAddOns",
    label: "Alternates / optional add-ons",
    description: "Proposal options and selected-options review totals.",
  },
  {
    id: "customerNotesTerms",
    label: "Customer notes / terms",
    description: "Customer-facing notes, terms, and proposal validity.",
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
      "alternatesAddOns",
      "customerNotesTerms",
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
      "alternatesAddOns",
      "customerNotesTerms",
    ],
  },
  {
    id: DEFAULT_ESTIMATE_PACKET_PRESET_ID,
    label: "GC Bid Packet",
    description: "Current customer-facing GC Lite output with all safe proposal and GC packet sections.",
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
      "alternatesAddOns",
      "customerNotesTerms",
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
      "alternatesAddOns",
      "customerNotesTerms",
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

function uniqueValidSectionIds(sectionIds = []) {
  return Array.from(new Set(Array.isArray(sectionIds) ? sectionIds : []))
    .filter((sectionId) => VALID_SECTION_IDS.has(sectionId));
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
    includes,
  };
}
