import { buildConstructionAgentTradeContext } from "../shared/constructionTrades.js";
import { deriveEstimateBackup } from "./estimate-backup-utils.js";
import { deriveEstimateProposalSections } from "./estimate-utils.js";

const TEXT_LIMIT = 900;
const LIST_LIMIT = 8;

function text(value, limit = TEXT_LIMIT) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, limit);
}

function array(values = [], limit = LIST_LIMIT) {
  return (Array.isArray(values) ? values : []).map((value) => text(value)).filter(Boolean).slice(0, limit);
}

function safeReferenceRows(backup = {}) {
  const rows = Array.isArray(backup?.referenceRows) ? backup.referenceRows : [];
  return rows.map((row) => ({
    fileName: text(row?.fileName || row?.name || row?.title, 180),
    referenceType: text(row?.referenceType || row?.type, 120),
    source: text(row?.source || row?.sheet || row?.planSheet, 180),
    notes: text(row?.notes || row?.estimatorNote, 360),
    hasUrl: Boolean(text(row?.url || row?.link || row?.imageUrl, 500)),
  })).filter((row) => row.fileName || row.referenceType || row.source || row.notes || row.hasUrl).slice(0, LIST_LIMIT);
}

function estimateLineItemLabels(estimate = {}) {
  return (Array.isArray(estimate?.items) ? estimate.items : [])
    .map((item) => text(item?.description || item?.name, 180))
    .filter(Boolean)
    .slice(0, LIST_LIMIT);
}

function optionLabel(option = {}) {
  return text(option?.title || option?.name || option?.label || option?.description, 180);
}

function inferVisualDirection({ estimate = {}, selectedOption = {}, tradeContext = {} } = {}) {
  const optionText = optionLabel(selectedOption);
  if (optionText) return optionText;
  const options = array(tradeContext.optionFamilies, 5);
  if (options.length) return options[0];
  return text(estimate?.title || estimate?.scopeSummary, 180) || "approved construction finish";
}

export function buildEstimateVisualPreviewPacket({
  estimate = {},
  backup = null,
  selectedOption = {},
  companySettings = {},
} = {}) {
  const normalizedBackup = backup || deriveEstimateBackup(estimate);
  const sections = deriveEstimateProposalSections(estimate);
  const tradeContext = buildConstructionAgentTradeContext({
    trade: estimate?.trade || estimate?.projectType,
    companySettings,
    estimate,
    lead: estimate?.lead || {},
  });
  const references = safeReferenceRows(normalizedBackup);
  const visualDirection = inferVisualDirection({ estimate, selectedOption, tradeContext });
  const missingReviewItems = [];

  if (!references.length) {
    missingReviewItems.push("Add at least one jobsite photo, plan screenshot, or reference attachment before generating a customer visual.");
  }
  if (!text(sections.scopeOfWork)) {
    missingReviewItems.push("Confirm scope of work so the visual prompt does not invent work.");
  }
  if (!visualDirection) {
    missingReviewItems.push("Select a finish, material, style, or option for the visual direction.");
  }

  const promptParts = [
    `Create a realistic, estimate-grade construction visual preview for ${tradeContext.tradeLabel}.`,
    `Project: ${text(estimate?.title || estimate?.lead?.project || "construction project", 220)}.`,
    `Visual direction: ${visualDirection}.`,
    sections.scopeOfWork ? `Scope: ${text(sections.scopeOfWork, 600)}.` : "",
    sections.inclusions ? `Include: ${text(sections.inclusions, 500)}.` : "",
    sections.exclusions ? `Do not show excluded work: ${text(sections.exclusions, 400)}.` : "",
    references.length ? `Use the provided jobsite/reference images as context; preserve the existing site layout and do not invent survey-grade dimensions.` : "",
    "Show a professional customer-facing concept image, not a permit drawing, engineering plan, or guaranteed final result.",
  ].filter(Boolean);

  return {
    mode: "review_first_visual_preview",
    tradeId: tradeContext.tradeId,
    tradeLabel: tradeContext.tradeLabel,
    selectedOptionLabel: visualDirection,
    prompt: promptParts.join(" "),
    referenceCount: references.length,
    references,
    optionFamilies: array(tradeContext.optionFamilies, 10),
    proofPhotoChecklist: array(tradeContext.proofPhotoChecklist, 8),
    lineItemLabels: estimateLineItemLabels(estimate),
    missingReviewItems,
    blockedActions: [
      "Does not generate or send customer-facing images automatically.",
      "Does not promise survey-grade accuracy, code compliance, final color, final material match, or final price.",
      "Does not change estimate totals, scope, job schedule, customer messages, or billing records.",
    ],
    disclaimer: "Concept visual only. Final appearance depends on approved materials, field conditions, dimensions, access, workmanship, lighting, and customer selections.",
  };
}

export function canRequestEstimateVisualPreview(packet = {}) {
  return Boolean(packet?.mode === "review_first_visual_preview" && Array.isArray(packet.missingReviewItems) && packet.missingReviewItems.length === 0);
}
