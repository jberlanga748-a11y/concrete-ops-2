import { buildConstructionAgentTradeContext, CONSTRUCTION_TRADE_PROFILES, getConstructionTradeProfile, normalizeConstructionTradeId } from "../shared/constructionTrades.js";
import { getEstimateLineItemStartersForTrade, getEstimateTemplateStartersForTrade } from "./estimate-template-utils.js";

function text(value, limit = 300) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, limit);
}

function compactLines(values = [], limit = 5) {
  return (Array.isArray(values) ? values : []).map((value) => text(value)).filter(Boolean).slice(0, limit);
}

export function deriveConstructionTradeSetupState(companySettings = {}, { previewLimit = 4 } = {}) {
  const configuredTradeId = normalizeConstructionTradeId(companySettings?.primaryTrade) || "general-contractor";
  const profile = getConstructionTradeProfile(configuredTradeId);
  const context = buildConstructionAgentTradeContext({
    trade: configuredTradeId,
    companySettings,
  });
  const templateStarters = getEstimateTemplateStartersForTrade(configuredTradeId);
  const lineItemStarters = getEstimateLineItemStartersForTrade(configuredTradeId);
  const serviceArea = text(companySettings?.serviceArea, 180);

  const readinessItems = [
    {
      id: "primary-trade",
      label: "Primary trade selected",
      complete: Boolean(profile?.id),
      detail: profile?.label || "Select a construction trade.",
      critical: true,
    },
    {
      id: "estimate-starters",
      label: "Estimate starters available",
      complete: templateStarters.length > 0 && lineItemStarters.length > 0,
      detail: `${templateStarters.length} templates / ${lineItemStarters.length} line item starters`,
      critical: true,
    },
    {
      id: "field-proof",
      label: "Field proof guidance available",
      complete: context.fieldHandoffChecklist.length > 0 && context.proofPhotoChecklist.length > 0,
      detail: `${context.fieldHandoffChecklist.length} handoff checks / ${context.proofPhotoChecklist.length} proof prompts`,
      critical: true,
    },
    {
      id: "closeout",
      label: "Closeout review guidance available",
      complete: context.closeoutChecks.length > 0 && context.changeOrderWatchouts.length > 0,
      detail: `${context.closeoutChecks.length} closeout checks / ${context.changeOrderWatchouts.length} change-order watchouts`,
      critical: false,
    },
    {
      id: "service-area",
      label: "Service area set",
      complete: Boolean(serviceArea),
      detail: serviceArea || "Add service area so leads and Opportunity Scout can judge local fit.",
      critical: false,
    },
  ];

  const criticalOpen = readinessItems.filter((item) => item.critical && !item.complete);
  const openItems = readinessItems.filter((item) => !item.complete);
  const ready = criticalOpen.length === 0;

  return {
    tradeId: profile?.id || "general-contractor",
    tradeLabel: profile?.label || "General Contractor",
    serviceArea,
    ready,
    status: ready ? "Trade workflow ready" : "Trade workflow needs setup",
    summary: ready
      ? `${profile?.label || "General contractor"} workflows are ready for estimates, field handoff, proof review, and closeout.`
      : `Finish ${criticalOpen[0]?.label.toLowerCase() || "trade setup"} before using this as the primary contractor workflow.`,
    supportedTrades: CONSTRUCTION_TRADE_PROFILES.map((trade) => ({ id: trade.id, label: trade.label })),
    readinessItems,
    openItems,
    estimateTemplates: templateStarters.map((template) => ({
      id: template.id,
      title: template.title,
      description: template.description,
    })).slice(0, previewLimit),
    lineItemStarters: lineItemStarters.map((starter) => ({
      id: starter.id,
      title: starter.title,
      unit: starter.unit,
    })).slice(0, previewLimit),
    optionFamilies: compactLines(context.optionFamilies, previewLimit),
    proposalSections: compactLines(context.proposalSections, previewLimit),
    fieldHandoffChecklist: compactLines(context.fieldHandoffChecklist, previewLimit),
    proofPhotoChecklist: compactLines(context.proofPhotoChecklist, previewLimit),
    changeOrderWatchouts: compactLines(context.changeOrderWatchouts, previewLimit),
    closeoutChecks: compactLines(context.closeoutChecks, previewLimit),
    agentGuidance: {
      tradeId: context.tradeId,
      tradeLabel: context.tradeLabel,
      safetyBoundary: context.safetyBoundary,
    },
  };
}
