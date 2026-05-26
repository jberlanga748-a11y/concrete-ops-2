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
  status: "draft",
  scopeSummary: "",
  internalNotes: "",
  customerNotes: "",
  taxRate: "",
  feesTotal: "",
  items: [{ ...INITIAL_ESTIMATE_LINE_ITEM }],
};

export function makeDraftRowId(prefix = "draft") {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
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
