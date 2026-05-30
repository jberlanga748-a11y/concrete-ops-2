import { deriveEstimatePrintModel } from "../shared/estimatePrint.js";
import { resolveEstimatePacketSettings } from "../shared/estimatePacketPresets.js";
import { deriveEstimateBackup } from "./estimate-backup-utils.js";
import { deriveEstimateGcPacketLite } from "./estimate-gc-packet-utils.js";
import {
  calculateEstimateOptionTotals,
  calculateEstimateTotals,
  deriveEstimateJobHandoffReadiness,
  estimateCustomerEmail,
  formatEstimateCurrency,
} from "./estimate-utils.js";

const BASELINE_PROTECTIONS = Object.freeze([
  "Company data stays separated by workspace",
  "Field roles stay out of estimates, pricing, margins, payroll, and office-only notes",
  "Customer packets exclude internal notes, private URLs, payroll, margins, and profit",
  "Live external sends require configured provider confirmation",
]);

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function text(value = "") {
  return String(value ?? "").trim();
}

function hasText(value = "") {
  return Boolean(text(value));
}

function hasEstimateViewAccess(permissions = {}) {
  const fieldOnly = permissions?.jobs?.canManageField
    && !permissions?.jobs?.canManageAll
    && !permissions?.estimates?.canView
    && !permissions?.estimates?.canManage;
  if (fieldOnly) return false;
  return Boolean(permissions?.estimates?.canView || permissions?.estimates?.canManage);
}

function row(id, label, ready, helper, action = "", tone = "") {
  return {
    id,
    label,
    ready: Boolean(ready),
    tone: tone || (ready ? "green" : "amber"),
    status: ready ? "Ready" : "Needs review",
    helper,
    action,
  };
}

function modelHasSection(model = {}, collectionKey = "", sectionKey = "") {
  return asArray(model[collectionKey]).some((section) => section.key === sectionKey || section.title === sectionKey);
}

function modelText(model = {}) {
  return JSON.stringify(model);
}

function customerVisibleModelText(model = {}) {
  return JSON.stringify({
    project: model.project,
    proposalSections: model.proposalSections,
    customerTermSections: model.customerTermSections,
    customerNotes: model.customerNotes,
    evidenceSections: model.evidenceSections,
    gcPacketLiteSections: model.gcPacketLiteSections,
    concreteSpecifications: model.concreteSpecifications,
    options: model.options,
    pricingOptions: model.pricingOptions,
    optionPhotoSections: model.optionPhotoSections,
    totals: model.totals,
    paymentTerms: model.paymentTerms,
    warrantyNotes: model.warrantyNotes,
    legalNotices: model.legalNotices,
  });
}

function customerPacketSettings(packetSettings = {}) {
  const presetId = String(packetSettings?.presetId || "").trim();
  if (/internal/i.test(presetId)) {
    return resolveEstimatePacketSettings({ presetId: "customerProposalPacket" });
  }
  return {
    ...packetSettings,
    allowInternalSections: false,
  };
}

function backupHasEvidence(backup = {}) {
  return Boolean(
    text(backup.notes)
      || asArray(backup.sovRows).length
      || asArray(backup.takeoffRows).length
      || asArray(backup.referenceRows).length
      || asArray(backup.fenceTakeoff?.segments).length,
  );
}

function gcPacketCustomerFields(gcPacketLite = {}) {
  return [
    gcPacketLite.proposalCoverNote,
    gcPacketLite.proposalSummary,
    gcPacketLite.qualifications,
    gcPacketLite.scheduleNotes,
    gcPacketLite.addendaRfiReferences,
  ].filter(hasText);
}

function optionCount(model = {}) {
  return asArray(model.options?.alternates).length
    + asArray(model.options?.addOns).length
    + asArray(model.pricingOptions?.options).length
    + asArray(model.optionPhotoSections).reduce((sum, section) => sum + asArray(section.records).length, 0);
}

function isEstimateRecord(estimate = {}) {
  return Boolean(estimate && typeof estimate === "object" && (estimate.id || estimate.title || estimate.items || estimate.scopeSummary));
}

export function deriveEstimateProposalFinishState({
  estimate = null,
  permissions = {},
  packetSettings = {},
  emailSendingConfigured = false,
  canUseGcPackets = false,
} = {}) {
  if (!hasEstimateViewAccess(permissions)) {
    return {
      canView: false,
      mode: "blocked_estimate_proposal_finish",
      summary: "Estimate proposal packets are office-only. Field users cannot access estimates, pricing, customer proposal packets, internal review, or send controls.",
      status: "Locked",
      tone: "slate",
      stats: {
        readyRows: 0,
        totalRows: 0,
        customerSections: 0,
        optionChoices: 0,
        evidenceSections: 0,
        gcSections: 0,
        internalSections: 0,
        handoffReady: false,
        emailSendingConfigured: false,
      },
      readinessRows: [],
      customerPacketRows: [],
      optionRows: [],
      gcPacketRows: [],
      fieldHandoffRows: [],
      providerRows: [],
      blockedActions: BASELINE_PROTECTIONS.slice(),
      safetyBoundary: "Field users stay blocked from estimates, proposal packets, pricing, margins, internal notes, billing, and customer send controls.",
    };
  }

  if (!isEstimateRecord(estimate)) {
    return {
      canView: true,
      mode: "empty_estimate_proposal_finish",
      summary: "Select an estimate to review final proposal packet readiness.",
      status: "Select estimate",
      tone: "slate",
      stats: {
        readyRows: 0,
        totalRows: 0,
        customerSections: 0,
        optionChoices: 0,
        evidenceSections: 0,
        gcSections: 0,
        internalSections: 0,
        handoffReady: false,
        emailSendingConfigured: Boolean(emailSendingConfigured),
      },
      readinessRows: [],
      customerPacketRows: [],
      optionRows: [],
      gcPacketRows: [],
      fieldHandoffRows: [],
      providerRows: [],
      blockedActions: BASELINE_PROTECTIONS.slice(),
      safetyBoundary: "Owner/admin proposal finish workspace.",
    };
  }

  const customerSettings = customerPacketSettings(packetSettings);
  const customerModel = deriveEstimatePrintModel(estimate, customerSettings);
  const internalModel = deriveEstimatePrintModel(estimate, {
    ...packetSettings,
    allowInternalSections: Boolean(packetSettings?.allowInternalSections && permissions?.estimates?.canManage),
  });
  const backup = deriveEstimateBackup(estimate);
  const gcPacketLite = deriveEstimateGcPacketLite(estimate);
  const totals = calculateEstimateTotals(estimate.items, {
    taxRate: estimate.taxRate,
    feesTotal: estimate.feesTotal,
  });
  const optionTotals = calculateEstimateOptionTotals(estimate);
  const handoff = deriveEstimateJobHandoffReadiness(estimate);
  const hasCustomer = hasText(estimate.customer?.name || estimate.customerName || estimate.lead?.customer || estimate.customerId);
  const hasContact = hasText(estimateCustomerEmail(estimate) || estimate.customerPhone || estimate.customer?.phone);
  const hasPricing = totals.grandTotal > 0 && asArray(estimate.items).length > 0;
  const hasScope = asArray(customerModel.proposalSections).some((section) => section.key === "scopeOfWork" || section.title === "Scope of Work");
  const hasInclusions = modelHasSection(customerModel, "proposalSections", "inclusions") || modelHasSection(customerModel, "proposalSections", "Inclusions");
  const hasExclusions = modelHasSection(customerModel, "proposalSections", "exclusions") || modelHasSection(customerModel, "proposalSections", "Exclusions");
  const hasAssumptions = modelHasSection(customerModel, "proposalSections", "assumptions") || modelHasSection(customerModel, "proposalSections", "Assumptions / Clarifications");
  const hasTerms = hasText(customerModel.customerNotes) || asArray(customerModel.customerTermSections).length > 0;
  const options = optionCount(customerModel);
  const hasOptions = options > 0 || optionTotals.selectedOptionsTotal > 0;
  const hasEvidence = asArray(customerModel.evidenceSections).length > 0 || backupHasEvidence(backup);
  const gcCustomerFieldCount = gcPacketCustomerFields(gcPacketLite).length;
  const hasGcPacket = !canUseGcPackets || gcCustomerFieldCount >= 3 || asArray(customerModel.gcPacketLiteSections).length >= 3;
  const hasFieldHandoff = handoff.readyForJob || handoff.converted || handoff.steps?.find((step) => step.id === "field-handoff")?.complete;
  const hasCustomerSafePrint = !/Office-only|Internal packet|Private SOV|Private sent history|Apex HQ Estimate Backup|Apex HQ GC Packet Lite|margin|profit|payroll/i.test(customerVisibleModelText(customerModel));
  const hasInternalIsolation = asArray(customerModel.internalSections).length === 0;

  const readinessRows = [
    row("customer", "Customer / contact", hasCustomer && hasContact, hasCustomer && hasContact ? "Customer and recipient path are set." : "Add customer and email or phone before customer output.", "Add customer/contact"),
    row("scope", "Scope of work", hasScope, hasScope ? "Customer-facing scope is present." : "Add clear scope of work before proposal review.", "Add scope"),
    row("pricing", "Pricing summary", hasPricing, hasPricing ? `${formatEstimateCurrency(totals.grandTotal)} base total is ready.` : "Add priced line items before sending.", "Finish pricing"),
    row("options", "Option comparison", hasOptions, hasOptions ? `${options} option/add-on/visual choice${options === 1 ? "" : "s"} available.` : "Add Basic / Recommended / Premium, alternates, or optional add-ons when useful.", "Add options", hasOptions ? "blue" : "slate"),
    row("terms", "Terms / exclusions", hasTerms && hasExclusions && hasAssumptions, hasTerms && hasExclusions && hasAssumptions ? "Terms, exclusions, and assumptions are customer-visible." : "Add terms, exclusions, and assumptions so the proposal is not vague.", "Add terms/exclusions"),
    row("evidence", "Photos / takeoff backup", hasEvidence, hasEvidence ? "Customer-safe evidence or office backup is linked." : "Add photo, takeoff, SOV, or reference backup before final packet.", "Add proof/takeoff", hasEvidence ? "blue" : "amber"),
    row("gc-packet", "GC packet", hasGcPacket, canUseGcPackets ? `${gcCustomerFieldCount} customer-safe GC field${gcCustomerFieldCount === 1 ? "" : "s"} ready.` : "GC packet tools are package-gated; customer packet can still print.", "Add GC packet notes", hasGcPacket ? "violet" : "amber"),
    row("foreman-handoff", "Foreman handoff", hasFieldHandoff, hasFieldHandoff ? "Field-safe handoff context is ready or converted." : "Add takeoff backup, schedule/access notes, or foreman handoff notes.", "Prepare handoff", hasFieldHandoff ? "green" : "amber"),
    row("safe-output", "Customer packet privacy", hasCustomerSafePrint && hasInternalIsolation, hasCustomerSafePrint && hasInternalIsolation ? "Customer packet excludes internal notes, private URLs, margins, and backup blocks." : "Review packet settings before customer use.", "Review customer packet"),
    row("send-mode", "Send path", emailSendingConfigured, emailSendingConfigured ? "Email provider is configured for explicit send confirmation." : "Provider not configured. Copy and print are available.", "Copy / print / provider setup", emailSendingConfigured ? "blue" : "amber"),
  ];

  const readyRows = readinessRows.filter((item) => item.ready).length;
  const customerReady = hasCustomer && hasContact && hasScope && hasPricing && hasTerms && hasExclusions && hasAssumptions && hasCustomerSafePrint && hasInternalIsolation;
  const packetReady = customerReady && (hasGcPacket || !canUseGcPackets);
  const status = packetReady && hasFieldHandoff
    ? "Finished packet ready"
    : customerReady
      ? "Customer packet ready"
      : "Needs proposal polish";

  return {
    canView: true,
    mode: "estimate_proposal_finish",
    summary: `${readyRows} of ${readinessRows.length} final proposal checks are ready. ${emailSendingConfigured ? "Email provider is configured for explicit send confirmation." : "Email provider is not configured, so copy and print are available."}`,
    status,
    tone: packetReady && hasFieldHandoff ? "green" : customerReady ? "blue" : "amber",
    stats: {
      readyRows,
      totalRows: readinessRows.length,
      customerSections: asArray(customerModel.proposalSections).length + asArray(customerModel.customerTermSections).length + (customerModel.customerNotes ? 1 : 0),
      optionChoices: options,
      evidenceSections: asArray(customerModel.evidenceSections).length,
      gcSections: asArray(customerModel.gcPacketLiteSections).length,
      internalSections: asArray(internalModel.internalSections).length,
      handoffReady: Boolean(hasFieldHandoff),
      emailSendingConfigured: Boolean(emailSendingConfigured),
    },
    readinessRows,
    customerPacketRows: [
      { label: "Packet preset", value: customerModel.packetSettings?.presetLabel || "Customer packet", tone: "blue" },
      { label: "Customer sections", value: `${asArray(customerModel.proposalSections).length} scope section${asArray(customerModel.proposalSections).length === 1 ? "" : "s"}`, tone: hasScope ? "green" : "amber" },
      { label: "Terms sections", value: `${asArray(customerModel.customerTermSections).length + (customerModel.customerNotes ? 1 : 0)} term section${asArray(customerModel.customerTermSections).length + (customerModel.customerNotes ? 1 : 0) === 1 ? "" : "s"}`, tone: hasTerms ? "green" : "amber" },
      { label: "Customer-safe print", value: hasCustomerSafePrint && hasInternalIsolation ? "Clean" : "Review needed", tone: hasCustomerSafePrint && hasInternalIsolation ? "green" : "amber" },
    ],
    optionRows: [
      { label: "Selected option total", value: formatEstimateCurrency(optionTotals.selectedOptionsTotal), tone: optionTotals.selectedOptionsTotal ? "blue" : "slate" },
      { label: "Total with selected options", value: formatEstimateCurrency(optionTotals.totalWithSelectedOptions), tone: hasPricing ? "green" : "amber" },
      { label: "Choices in packet", value: String(options), tone: options ? "blue" : "slate" },
    ],
    gcPacketRows: [
      { label: "Customer-safe GC fields", value: `${gcCustomerFieldCount} / 5`, tone: gcCustomerFieldCount >= 3 ? "violet" : "amber" },
      { label: "Printed GC sections", value: String(asArray(customerModel.gcPacketLiteSections).length), tone: asArray(customerModel.gcPacketLiteSections).length ? "violet" : "slate" },
      { label: "Internal packet sections", value: String(asArray(internalModel.internalSections).length), tone: asArray(internalModel.internalSections).length ? "amber" : "slate" },
    ],
    fieldHandoffRows: asArray(handoff.steps).map((step) => ({
      label: step.label,
      value: step.complete ? "Ready" : step.nextAction,
      tone: step.complete ? "green" : "amber",
      helper: step.helper,
    })),
    providerRows: [
      { label: "Email provider", value: emailSendingConfigured ? "Configured" : "Needs account/API key", tone: emailSendingConfigured ? "blue" : "amber" },
      { label: "Customer send", value: emailSendingConfigured ? "Provider confirmation" : "Copy / print", tone: emailSendingConfigured ? "blue" : "amber" },
      { label: "Manual fallback", value: "Copy / print ready", tone: customerReady ? "green" : "slate" },
    ],
    blockedActions: BASELINE_PROTECTIONS.slice(),
    safetyBoundary: "Owner/admin estimate finish workspace. Customer packets exclude internal notes, backup blocks, private URLs, margin/profit/payroll, and field-only data; field handoff stays pricing-free.",
  };
}
