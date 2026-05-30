import { deriveEstimateGcPacketLite } from "./estimate-gc-packet-utils.js";
import { estimateRoughNotesBullets, estimateRoughNotesText, hasMeaningfulEstimateItems } from "./estimate-rough-notes-utils.js";
import { getEstimateVisibleInternalNotes, mergeEstimateGcPacketLite, mergeEstimateOfficeInternalNotes } from "./estimate-snapshot-utils.js";
import { buildEstimateLineItemsFromRoughNotes } from "./estimate-template-utils.js";
import { deriveEstimateProposalSections, estimateCustomerEmail, mergeEstimateProposalSections } from "./estimate-utils.js";

export const INITIAL_ESTIMATE_LINE_ITEM = {
  description: "",
  quantity: 1,
  unit: "ea",
  unitPrice: "",
};

export const INITIAL_ESTIMATE_FORM = {
  customerId: "",
  leadId: "",
  customerName: "",
  customerEmail: "",
  title: "",
  trade: "",
  proposalPacketType: "residential",
  status: "draft",
  scopeSummary: "",
  internalNotes: "",
  customerNotes: "",
  taxRate: "",
  feesTotal: "",
  items: [{ ...INITIAL_ESTIMATE_LINE_ITEM }],
};

export const ESTIMATE_PROPOSAL_TYPE_OPTIONS = [
  {
    id: "residential",
    label: "Residential",
    packetPresetId: "residentialProposalPacket",
    description: "Homeowner proposal with clear scope, options, payment terms, warranty notes, and approval steps.",
    sections: {
      scopeOfWork: "Describe the homeowner work area, prep, installation, finish, cleanup, and protection plan.",
      inclusions: "Standard labor, materials, equipment, cleanup, and agreed finish details required for this residential scope.",
      exclusions: "Permits, utility relocation, concealed conditions, owner-requested extras, and work not listed in this proposal.",
      assumptions: "Access, weather, existing base condition, owner approvals, and schedule are subject to final office review.",
      customerNotes: [
        "Payment Terms:",
        "Deposit, progress payment, and final balance to be confirmed before approval.",
        "",
        "Warranty / Workmanship Notes:",
        "Workmanship warranty and material limitations to be reviewed with the homeowner before release.",
        "",
        "Acceptance / Next Steps:",
        "Review scope, finish, price, and schedule window before signing.",
        "",
        "Residential Legal Notices:",
        "Required notices, owner responsibilities, permit/lien disclosures, and cancellation rights must be reviewed before release.",
      ].join("\n"),
    },
    gcPacketLite: {},
  },
  {
    id: "commercial",
    label: "Commercial",
    packetPresetId: "commercialSubcontractorPacket",
    description: "Commercial customer or subcontractor proposal with scope boundaries, qualifications, coordination, and billing terms.",
    sections: {
      scopeOfWork: "Describe the commercial work area, included scope, sequencing, access, coordination points, and closeout expectations.",
      inclusions: "Labor, materials, equipment, standard coordination, cleanup, and listed project deliverables for this commercial scope.",
      exclusions: "Permits unless listed, engineering, utility relocation, off-hours premiums, hidden conditions, and work outside listed scope.",
      assumptions: "Pricing assumes reviewed plans, normal access, coordinated schedule, standard working hours, and mutually accepted terms.",
      customerNotes: [
        "Payment Terms:",
        "Progress billing, retainage, change-order pricing, and final payment terms to be confirmed before release.",
        "",
        "Acceptance / Next Steps:",
        "Review inclusions, exclusions, addenda, access, insurance requirements, and schedule assumptions before award.",
      ].join("\n"),
    },
    gcPacketLite: {
      proposalSummary: "Commercial proposal summary, scope boundaries, and coordination notes are ready for estimator review.",
      qualifications: "Final qualifications, insurance requirements, addenda, and project-team notes must be reviewed before release.",
      scheduleNotes: "Schedule assumptions, access windows, crew sequencing, and owner/GC coordination must be confirmed before award.",
    },
  },
  {
    id: "gc",
    label: "GC / Prime",
    packetPresetId: "gcPrimeProposalPacket",
    description: "GC-ready bid package with addenda, RFI references, qualifications, alternates, and award-review language.",
    sections: {
      scopeOfWork: "Describe bid scope by area, phase, plan reference, included work, and handoff requirements for GC review.",
      inclusions: "Listed labor, materials, equipment, coordination, cleanup, and closeout items included in this GC proposal.",
      exclusions: "Unlisted plan scope, design changes, permits unless noted, testing, utility conflicts, hidden conditions, and owner/GC changes.",
      assumptions: "Bid assumes reviewed drawings, stated addenda, normal access, schedule coordination, and written approval of changes.",
      customerNotes: [
        "Payment Terms:",
        "Progress billing, retainage, approved change orders, and closeout payment terms to be confirmed before award.",
        "",
        "Acceptance / Next Steps:",
        "Confirm addenda, inclusions, exclusions, alternates, schedule assumptions, and subcontract terms before award.",
      ].join("\n"),
    },
    gcPacketLite: {
      proposalCoverNote: "GC / prime bid package prepared for award review. Confirm addenda, scope boundaries, and schedule assumptions before release.",
      proposalSummary: "GC-facing proposal summary should identify bid scope, alternates, qualifications, schedule assumptions, and closeout expectations.",
      qualifications: "Review plan references, addenda, RFIs, exclusions, alternates, insurance requirements, and subcontract terms before sending.",
      scheduleNotes: "Schedule assumes coordinated access, normal working hours, GC-provided sequencing, and approved change-order handling.",
      addendaRfiReferences: "Add drawing sheets, addenda numbers, RFI responses, and bid package references before release.",
    },
  },
];

export function makeDraftRowId(prefix = "draft") {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getEstimateProposalTypeOption(typeId = INITIAL_ESTIMATE_FORM.proposalPacketType) {
  return ESTIMATE_PROPOSAL_TYPE_OPTIONS.find((option) => option.id === typeId)
    || ESTIMATE_PROPOSAL_TYPE_OPTIONS[0];
}

function preferExistingText(existingValue, starterValue) {
  return estimateRoughNotesText(existingValue) || estimateRoughNotesText(starterValue);
}

export function createEstimateLineItemDraft(item = {}) {
  return {
    id: item.id || makeDraftRowId("estimate-item"),
    description: item.description || "",
    quantity: item.quantity ?? 1,
    unit: item.unit || "ea",
    unitPrice: item.unitPrice ?? "",
  };
}

export function createEstimateDraft(record) {
  return {
    customerId: record?.customerId || "",
    leadId: record?.leadId || "",
    customerName: record?.customer?.name || record?.customerName || "",
    customerEmail: record?.customerEmail || estimateCustomerEmail(record) || "",
    title: record?.title || "",
    trade: record?.trade || record?.lead?.trade || "",
    proposalPacketType: getEstimateProposalTypeOption(record?.proposalPacketType).id,
    status: record?.status || "draft",
    scopeSummary: record?.scopeSummary || "",
    internalNotes: record?.internalNotes || "",
    customerNotes: record?.customerNotes || "",
    taxRate: record?.taxRate ?? "",
    feesTotal: record?.feesTotal ?? "",
    items: Array.isArray(record?.items) && record.items.length > 0
      ? record.items.map((item) => createEstimateLineItemDraft(item))
      : [createEstimateLineItemDraft()],
  };
}

export function applyEstimateProposalTypeToDraft(draft = {}, typeId = INITIAL_ESTIMATE_FORM.proposalPacketType, options = {}) {
  const { includeGcPacket = true } = options;
  const selectedType = getEstimateProposalTypeOption(typeId);
  const nextDraft = createEstimateDraft({
    ...draft,
    proposalPacketType: selectedType.id,
  });
  const currentSections = deriveEstimateProposalSections(nextDraft);
  let typedDraft = mergeEstimateProposalSections(nextDraft, {
    ...currentSections,
    scopeOfWork: preferExistingText(currentSections.scopeOfWork, selectedType.sections.scopeOfWork),
    inclusions: preferExistingText(currentSections.inclusions, selectedType.sections.inclusions),
    exclusions: preferExistingText(currentSections.exclusions, selectedType.sections.exclusions),
    assumptions: preferExistingText(currentSections.assumptions, selectedType.sections.assumptions),
    customerNotes: preferExistingText(currentSections.customerNotes, selectedType.sections.customerNotes),
  });

  if (includeGcPacket && Object.keys(selectedType.gcPacketLite || {}).length > 0) {
    const currentPacket = deriveEstimateGcPacketLite(typedDraft);
    typedDraft = mergeEstimateGcPacketLite(typedDraft, {
      ...currentPacket,
      proposalCoverNote: preferExistingText(currentPacket.proposalCoverNote, selectedType.gcPacketLite.proposalCoverNote),
      proposalSummary: preferExistingText(currentPacket.proposalSummary, selectedType.gcPacketLite.proposalSummary),
      qualifications: preferExistingText(currentPacket.qualifications, selectedType.gcPacketLite.qualifications),
      scheduleNotes: preferExistingText(currentPacket.scheduleNotes, selectedType.gcPacketLite.scheduleNotes),
      addendaRfiReferences: preferExistingText(currentPacket.addendaRfiReferences, selectedType.gcPacketLite.addendaRfiReferences),
      gcReviewNotes: currentPacket.gcReviewNotes,
      internalPacketNotes: currentPacket.internalPacketNotes,
    });
  }

  return createEstimateDraft(typedDraft);
}

export function mergeEstimateRoughNotesIntoDraft(draft = {}, result = {}, options = {}, roughNotesText = "") {
  const {
    includeProposal = true,
    includeGcPacket = true,
    includeReviewNotes = true,
  } = options;
  const extractedCustomerName = estimateRoughNotesText(result.customerName);
  const extractedProjectName = estimateRoughNotesText(result.projectName);
  const extractedJobLocation = estimateRoughNotesText(result.jobLocation);
  const extractedContactName = estimateRoughNotesText(result.contactName);
  const extractedEmail = estimateRoughNotesText(result.customerEmail);
  let nextDraft = {
    ...draft,
    customerName: estimateRoughNotesText(draft.customerName) || extractedCustomerName,
    customerEmail: estimateRoughNotesText(draft.customerEmail) || extractedEmail,
    title: estimateRoughNotesText(draft.title) || extractedProjectName || estimateRoughNotesText(result.suggestedTitle),
  };

  if (includeProposal) {
    const currentSections = deriveEstimateProposalSections(nextDraft);
    const assumptions = estimateRoughNotesBullets([
      ...(Array.isArray(result.assumptions) ? result.assumptions : []),
      estimateRoughNotesText(result.scheduleNotes) ? `Schedule: ${estimateRoughNotesText(result.scheduleNotes)}` : "",
      extractedJobLocation ? `Job location: ${extractedJobLocation}` : "",
      extractedContactName ? `Primary contact: ${extractedContactName}` : "",
    ]);
    nextDraft = mergeEstimateProposalSections(nextDraft, {
      ...currentSections,
      scopeOfWork: estimateRoughNotesText(result.scopeOfWork) || currentSections.scopeOfWork,
      inclusions: estimateRoughNotesBullets(result.inclusions) || currentSections.inclusions,
      exclusions: estimateRoughNotesBullets(result.exclusions) || currentSections.exclusions,
      assumptions: assumptions || currentSections.assumptions,
      customerNotes: estimateRoughNotesText(result.customerNotes) || currentSections.customerNotes,
    });
  }

  if (includeGcPacket) {
    const currentPacket = deriveEstimateGcPacketLite(nextDraft);
    const reviewNotes = estimateRoughNotesBullets([
      ...(Array.isArray(result.clarificationNotes) ? result.clarificationNotes : []),
      ...(Array.isArray(result.reviewWarnings) ? result.reviewWarnings : []),
    ]);
    nextDraft = mergeEstimateGcPacketLite(nextDraft, {
      ...currentPacket,
      proposalCoverNote: estimateRoughNotesText(result.gcCoverNote) || currentPacket.proposalCoverNote,
      proposalSummary: estimateRoughNotesText(result.gcProposalSummary) || currentPacket.proposalSummary,
      qualifications: estimateRoughNotesText(result.gcQualifications) || currentPacket.qualifications,
      scheduleNotes: estimateRoughNotesText(result.scheduleNotes) || currentPacket.scheduleNotes,
      gcReviewNotes: reviewNotes || currentPacket.gcReviewNotes,
      internalPacketNotes: estimateRoughNotesText(result.internalReviewNotes) || currentPacket.internalPacketNotes,
    });
  }

  if (includeReviewNotes && estimateRoughNotesText(result.internalReviewNotes)) {
    const existingVisibleNotes = getEstimateVisibleInternalNotes(nextDraft);
    const reviewBlock = `AI Rough Notes Review:\n${estimateRoughNotesText(result.internalReviewNotes)}`;
    const nextVisibleNotes = existingVisibleNotes.includes(reviewBlock)
      ? existingVisibleNotes
      : [existingVisibleNotes, reviewBlock].filter(Boolean).join("\n\n");
    nextDraft = mergeEstimateOfficeInternalNotes(nextDraft, nextVisibleNotes);
  }

  const suggestedLineItems = buildEstimateLineItemsFromRoughNotes(roughNotesText, result);
  if (suggestedLineItems.length > 0 && !hasMeaningfulEstimateItems(nextDraft.items)) {
    nextDraft = {
      ...nextDraft,
      items: suggestedLineItems,
    };
  }

  return createEstimateDraft(nextDraft);
}
