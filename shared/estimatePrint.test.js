import assert from "node:assert/strict";
import test from "node:test";

import { deriveEstimatePrintModel } from "./estimatePrint.js";

function gcPacketLiteBlock(fields = {}) {
  return [
    "[Apex HQ GC Packet Lite]",
    JSON.stringify(fields),
    "[/Apex HQ GC Packet Lite]",
  ].join("\n");
}

test("estimate print model separates proposal sections and excludes internal notes", () => {
  const model = deriveEstimatePrintModel({
    scopeSummary: [
      "Scope of Work:",
      "Remove driveway panels.",
      "",
      "Inclusions:",
      "Sawcut and haul off.",
      "",
      "Exclusions:",
      "Permit fees.",
      "",
      "Assumptions / Clarifications:",
      "Access is clear.",
    ].join("\n"),
    customerNotes: "Customer Notes / Terms:\nValid for 30 days.",
    internalNotes: "Office-only margin note.",
  });

  assert.deepEqual(model.proposalSections.map((section) => section.title), [
    "Scope of Work",
    "Inclusions",
    "Exclusions",
    "Assumptions / Clarifications",
  ]);
  assert.equal(model.proposalSections[0].text, "Remove driveway panels.");
  assert.equal(model.customerNotes, "Valid for 30 days.");
  assert.doesNotMatch(JSON.stringify(model), /Office-only margin note/);
});

test("estimate print model includes safe GC Lite sections and excludes office-only packet notes", () => {
  const model = deriveEstimatePrintModel({
    internalNotes: [
      "Office-only margin note.",
      gcPacketLiteBlock({
        proposalCoverNote: "Thank you for the opportunity to price this work.",
        proposalSummary: "GC-facing commercial concrete summary.",
        qualifications: "Proposal is based on plans dated May 1.",
        scheduleNotes: "Schedule to be coordinated with the GC.",
        addendaRfiReferences: "RFI 03 and Addendum 01 reviewed.",
        gcReviewNotes: "Office-only GC strategy.",
        internalPacketNotes: "Missing internal packet item.",
      }),
      "[Apex HQ Estimate Backup]",
      JSON.stringify({ notes: "Private SOV backup" }),
      "[/Apex HQ Estimate Backup]",
      "[Apex HQ Sent Proposal History]",
      JSON.stringify([{ snapshotId: "snap-private", notes: "Private sent history" }]),
      "[/Apex HQ Sent Proposal History]",
    ].join("\n"),
  });

  assert.deepEqual(model.gcPacketLiteSections.map((section) => section.title), [
    "Proposal Cover Note",
    "Proposal Summary",
    "Qualifications",
    "Schedule Notes",
    "Addenda / RFI References",
  ]);
  assert.equal(model.gcPacketLiteSections[0].text, "Thank you for the opportunity to price this work.");

  const printedText = JSON.stringify(model);
  assert.match(printedText, /GC-facing commercial concrete summary/);
  assert.match(printedText, /RFI 03 and Addendum 01 reviewed/);
  assert.doesNotMatch(printedText, /Office-only margin note/);
  assert.doesNotMatch(printedText, /Office-only GC strategy/);
  assert.doesNotMatch(printedText, /Missing internal packet item/);
  assert.doesNotMatch(printedText, /Private SOV backup/);
  assert.doesNotMatch(printedText, /Private sent history/);
  assert.doesNotMatch(printedText, /Apex HQ GC Packet Lite/);
});

test("estimate print presets can hide GC Lite sections without changing totals", () => {
  const model = deriveEstimatePrintModel({
    items: [{ description: "Base slab", quantity: 1, unit: "LS", unitPrice: 10000 }],
    scopeSummary: "Scope of Work:\nPlace concrete slab.",
    internalNotes: gcPacketLiteBlock({
      proposalCoverNote: "GC cover note.",
      proposalSummary: "GC proposal summary.",
      qualifications: "Qualification note.",
      scheduleNotes: "Schedule note.",
      addendaRfiReferences: "Addendum 01.",
    }),
  }, {
    presetId: "basicEstimate",
  });

  assert.equal(model.packetSettings.presetId, "basicEstimate");
  assert.equal(model.gcPacketLiteSections.length, 0);
  assert.equal(model.totals.grandTotal, 10000);
  assert.deepEqual(model.proposalSections.map((section) => section.title), ["Scope of Work"]);
});

test("professional estimate packet presets standardize customer-facing sections", () => {
  const estimate = {
    items: [{ description: "Base slab", quantity: 1, unit: "LS", unitPrice: 10000 }],
    scopeSummary: "Scope of Work:\nPlace concrete slab.",
    customerNotes: [
      "Customer Notes / Terms:",
      "Valid for 30 days.",
      "",
      "Payment Terms:",
      "50% deposit to schedule, balance due at completion.",
      "",
      "Warranty:",
      "Workmanship warranty is project-specific and excludes normal concrete movement.",
      "",
      "Acceptance / Next Steps:",
      "Signed approval and deposit release scheduling.",
    ].join("\n"),
    internalNotes: gcPacketLiteBlock({
      proposalCoverNote: "Customer cover note.",
      proposalSummary: "Customer proposal summary.",
      qualifications: "Qualification note.",
      scheduleNotes: "Schedule note.",
      addendaRfiReferences: "Addendum 01.",
      gcReviewNotes: "Office-only GC note.",
      internalPacketNotes: "Internal office note.",
    }),
  };

  const estimateSheet = deriveEstimatePrintModel(estimate, {
    presetId: "polishedEstimateSheet",
  });
  assert.equal(estimateSheet.packetSettings.presetLabel, "Polished Estimate Sheet");
  assert.equal(estimateSheet.cover.coverKicker, "Concrete Estimate");
  assert.equal(estimateSheet.cover.statementTitle, "Ready for customer review.");
  assert.equal(estimateSheet.cover.isEstimateSheet, true);
  assert.equal(estimateSheet.cover.trustCards[0].title, "Scope clarity");
  assert.match(estimateSheet.cover.statementBody, /customer-ready estimate/);
  assert.doesNotMatch(estimateSheet.cover.statementBody, /proposal packet/);
  assert.equal(estimateSheet.packetSettings.includes.proposalCoverNote, false);
  assert.equal(estimateSheet.packetSettings.includes.projectEvidence, true);
  assert.equal(estimateSheet.totals.grandTotal, 10000);
  assert.deepEqual(estimateSheet.customerTermSections.map((section) => section.title), [
    "Payment Terms",
    "Warranty / Workmanship Notes",
    "Acceptance / Next Steps",
  ]);

  const proposalPacket = deriveEstimatePrintModel(estimate, {
    presetId: "customerProposalPacket",
  });
  const proposalText = JSON.stringify(proposalPacket);
  assert.equal(proposalPacket.packetSettings.presetLabel, "Customer Proposal Packet");
  assert.equal(proposalPacket.gcPacketLiteSections.some((section) => section.title === "Proposal Cover Note"), true);
  assert.match(proposalText, /Customer proposal summary/);
  assert.doesNotMatch(proposalText, /Office-only GC note/);
  assert.doesNotMatch(proposalText, /Internal office note/);

  const residentialPacket = deriveEstimatePrintModel(estimate, {
    presetId: "residentialProposalPacket",
    customization: {
      themeId: "custom-brand",
      customThemeName: "Homeowner Brand",
      headerColor: "#102a43",
      headerTextColor: "#ffffff",
      accentColor: "#c2410c",
      coverTitle: "Residential Finish Package",
      coverKicker: "Residential Proposal",
      tagline: "Clear scope. Clean finish. Built for your home.",
      statementTitle: "Ready for homeowner review.",
      statementBody: "Options, terms, warranty notes, and approval details are organized for a confident homeowner decision.",
      reviewNote: "Confirm finish, schedule, and payment terms before approval.",
    },
  });
  assert.equal(residentialPacket.packetSettings.presetLabel, "Residential Proposal Packet");
  assert.equal(residentialPacket.packetSettings.includes.warrantyNotes, true);
  assert.equal(residentialPacket.cover.packetTitle, "Residential Finish Package");
  assert.equal(residentialPacket.cover.coverKicker, "Residential Proposal");
  assert.equal(residentialPacket.cover.theme.id, "custom-brand");
  assert.equal(residentialPacket.cover.theme.accentColor, "#c2410c");

  const defaultResidentialPacket = deriveEstimatePrintModel(estimate, {
    presetId: "residentialProposalPacket",
  });
  assert.equal(defaultResidentialPacket.cover.coverKicker, "Residential Concrete Proposal");
  assert.equal(defaultResidentialPacket.cover.statementTitle, "Ready for homeowner review.");
  assert.match(defaultResidentialPacket.cover.statementBody, /homeowner-ready proposal/);
  assert.doesNotMatch(defaultResidentialPacket.cover.statementBody, /contractor proposal packet/);
  assert.equal(defaultResidentialPacket.cover.trustCards[0].title, "Home scope");

  const gcPrimePacket = deriveEstimatePrintModel(estimate, {
    presetId: "gcPrimeProposalPacket",
    customization: {
      themeId: "blueprint-blue",
      coverTitle: "Bid Package",
      coverKicker: "Concrete Bid",
      tagline: "Built for GC review.",
      statementTitle: "Ready for award review.",
      statementBody: "Custom scope, alternates, and closeout expectations are organized for the GC team.",
      reviewNote: "Confirm addenda and inclusions before award.",
    },
  });
  assert.equal(gcPrimePacket.packetSettings.presetLabel, "GC / Prime Proposal Packet");
  assert.equal(gcPrimePacket.packetSettings.includes.addendaRfiReferences, true);
  assert.equal(gcPrimePacket.cover.packetTitle, "Bid Package");
  assert.equal(gcPrimePacket.cover.coverKicker, "Concrete Bid");
  assert.equal(gcPrimePacket.cover.tagline, "Built for GC review.");
  assert.equal(gcPrimePacket.cover.statementTitle, "Ready for award review.");
  assert.equal(gcPrimePacket.cover.statementBody, "Custom scope, alternates, and closeout expectations are organized for the GC team.");
  assert.equal(gcPrimePacket.cover.reviewNote, "Confirm addenda and inclusions before award.");
  assert.equal(gcPrimePacket.cover.theme.id, "blueprint-blue");
  assert.equal(gcPrimePacket.cover.theme.accentColor, "#2563eb");

  const defaultGcPrimePacket = deriveEstimatePrintModel(estimate, {
    presetId: "gcPrimeProposalPacket",
  });
  assert.equal(defaultGcPrimePacket.cover.coverKicker, "Concrete Bid Package");
  assert.equal(defaultGcPrimePacket.cover.statementTitle, "Ready for award review.");
  assert.match(defaultGcPrimePacket.cover.statementBody, /GC-ready bid package/);
  assert.doesNotMatch(defaultGcPrimePacket.cover.statementBody, /contractor proposal packet/);
  assert.equal(defaultGcPrimePacket.cover.trustCards[0].title, "Bid scope");

  const customBrandPacket = deriveEstimatePrintModel(estimate, {
    presetId: "gcPrimeProposalPacket",
    customization: {
      themeId: "custom-brand",
      customThemeName: "Berlanda Concrete",
      headerColor: "123abc",
      headerTextColor: "#fefefe",
      accentColor: "#00aa88",
    },
  });
  assert.equal(customBrandPacket.cover.theme.id, "custom-brand");
  assert.equal(customBrandPacket.cover.theme.label, "Berlanda Concrete");
  assert.equal(customBrandPacket.cover.theme.headerColor, "#123abc");
  assert.equal(customBrandPacket.cover.theme.headerTextColor, "#fefefe");
  assert.equal(customBrandPacket.cover.theme.accentColor, "#00aa88");

  const commercialSubPacket = deriveEstimatePrintModel(estimate, {
    presetId: "commercialSubcontractorPacket",
    customization: {
      themeId: "custom-brand",
      customThemeName: "Commercial Sub Brand",
      headerColor: "#172554",
      headerTextColor: "#ffffff",
      accentColor: "#0f766e",
      coverTitle: "Commercial Sub Bid",
      coverKicker: "Subcontractor Proposal",
      tagline: "Scope boundaries, coordination notes, and billing terms ready for review.",
      statementTitle: "Ready for subcontract review.",
      statementBody: "Qualifications, schedule coordination, alternates, exclusions, and billing terms are organized for the project team.",
      reviewNote: "Confirm scope limits, addenda, access, and billing terms before award.",
    },
  });
  assert.equal(commercialSubPacket.packetSettings.presetLabel, "Commercial Subcontractor Packet");
  assert.equal(commercialSubPacket.packetSettings.includes.qualifications, true);
  assert.equal(commercialSubPacket.packetSettings.includes.scheduleNotes, true);
  assert.equal(commercialSubPacket.packetSettings.includes.legalNotices, false);
  assert.equal(commercialSubPacket.cover.packetTitle, "Commercial Sub Bid");
  assert.equal(commercialSubPacket.cover.coverKicker, "Subcontractor Proposal");
  assert.equal(commercialSubPacket.cover.theme.accentColor, "#0f766e");

  const commercialLeakGuardEstimate = {
    ...estimate,
    customerNotes: [
      estimate.customerNotes,
      "",
      "Residential Legal Notices:",
      "Owner is responsible for utility locates and HOA approvals.",
      "",
      "Customer Approval:",
      "Homeowner approval record should not print in commercial subcontractor packets.",
    ].join("\n"),
    internalNotes: [
      estimate.internalNotes,
      "[Apex HQ Estimate Backup]",
      JSON.stringify({
        referenceRows: [{ fileName: "Private commercial takeoff.png", url: "https://files.example.test/private/commercial.png", notes: "Private takeoff note" }],
        notes: "Private SOV backup",
      }),
      "[/Apex HQ Estimate Backup]",
    ].join("\n"),
  };

  const defaultCommercialSubPacket = deriveEstimatePrintModel(commercialLeakGuardEstimate, {
    presetId: "commercialSubcontractorPacket",
  });
  const defaultCommercialText = JSON.stringify(defaultCommercialSubPacket);
  assert.equal(defaultCommercialSubPacket.cover.packetTitle, "Commercial Sub Bid");
  assert.equal(defaultCommercialSubPacket.cover.coverKicker, "Subcontractor Proposal");
  assert.equal(defaultCommercialSubPacket.cover.statementTitle, "Ready for subcontract review.");
  assert.match(defaultCommercialSubPacket.cover.tagline, /Scope boundaries, coordination notes, and billing terms/);
  assert.match(defaultCommercialSubPacket.cover.statementBody, /Qualifications, schedule coordination, alternates, exclusions, and billing terms/);
  assert.equal(defaultCommercialSubPacket.cover.reviewNote, "Confirm scope limits, addenda, access, and billing terms before award.");
  assert.equal(defaultCommercialSubPacket.cover.trustCards[0].title, "Scope limits");
  assert.equal(defaultCommercialSubPacket.cover.trustCards[2].title, "Billing terms");
  assert.doesNotMatch(defaultCommercialSubPacket.cover.statementBody, /contractor proposal packet/);
  assert.doesNotMatch(defaultCommercialText, /Office-only GC note|Internal office note|Private SOV backup|Private takeoff note/);
  assert.doesNotMatch(defaultCommercialText, /files\.example\.test|Apex HQ Estimate Backup|Apex HQ GC Packet Lite/);
  assert.doesNotMatch(defaultCommercialText, /Residential Legal Notices|Owner is responsible for utility locates|Customer Approval Record|Homeowner approval record/);
});

test("estimate print model ports proposal-app cleanup for placeholders and terms", () => {
  const model = deriveEstimatePrintModel({
    scopeSummary: [
      "Scope of Work:",
      "New scope item",
      "Interior freezer slab demo and replacement.",
      "Untitled",
      "",
      "Exclusions:",
      "New item",
      "Testing by others.",
    ].join("\n"),
    customerNotes: [
      "Customer Notes / Terms:",
      "Proposal valid for 30 days.",
      "",
      "Payment:",
      "Progress billing by approved application.",
      "",
      "Warranty Note:",
      "Concrete warranty excludes owner-directed changes and normal cracking.",
      "",
      "Next Steps:",
      "Approve proposal and confirm start window.",
      "",
      "Concrete Specifications:",
      "Thickness: 4 inch slab with thickened edge where noted.",
      "Finish: Broom finish with sawcut control joints.",
      "Concrete Strength: 4000 PSI.",
      "",
      "Pricing Options:",
      "- [selected] Standard driveway | Price: $12,500 | Deposit: $3,125 | Final Payment: $9,375 | Description: Broom finish driveway replacement. | Photo: https://cdn.example.test/options/standard.jpg | Caption: Standard broom finish sample.",
      "- [optional] Premium border | Price: $14,850 | Image: file:///C:/secret/premium.jpg | Caption: Decorative border sample.",
      "",
      "Option Photo Pages:",
      "- Cure photo | Photo: https://cdn.example.test/options/cure.jpg | Caption: Cure blanket reference. | Notes: Visual reference only.",
      "",
      "Residential Legal Notices:",
      "Owner is responsible for utility locates, irrigation lines, and required HOA approvals.",
      "",
      "Customer Approval:",
      "Selected standard driveway option approved by Jamie Martinez on 5/20/2026.",
      "",
      "Alternates:",
      "- [optional] Add Alternate 01 | Amount: $0",
      "- [optional] Sawcut freezer curb | Amount: $1,200 | Description: Add curb work.",
    ].join("\n"),
  }, {
    presetId: "gcPrimeProposalPacket",
  });
  const printedText = JSON.stringify(model);

  assert.match(printedText, /Interior freezer slab demo and replacement/);
  assert.match(printedText, /Testing by others/);
  assert.match(printedText, /Payment Terms/);
  assert.match(printedText, /Progress billing by approved application/);
  assert.match(printedText, /Warranty \/ Workmanship Notes/);
  assert.match(printedText, /Approve proposal and confirm start window/);
  assert.equal(model.concreteSpecSections.length, 1);
  assert.equal(model.concreteSpecSections[0].records.some((record) => record.title === "Thickness"), true);
  assert.match(printedText, /Broom finish with sawcut control joints/);
  assert.equal(model.pricingOptions.options.length, 2);
  assert.equal(model.pricingOptions.selectedOptionAmount, 12500);
  assert.equal(model.pricingOptions.options[0].downPaymentLabel, "$3,125.00");
  assert.equal(model.pricingOptions.options[0].finalPaymentLabel, "$9,375.00");
  assert.equal(model.optionPhotoSections.length, 1);
  assert.equal(model.optionPhotoSections[0].records.some((record) => record.imageUrl === "https://cdn.example.test/options/standard.jpg"), true);
  assert.equal(model.optionPhotoSections[0].records.some((record) => record.body.join(" ").includes("https://")), false);
  assert.doesNotMatch(printedText, /Residential Legal Notices/);
  assert.doesNotMatch(printedText, /Owner is responsible for utility locates/);
  assert.doesNotMatch(printedText, /Customer Approval Record/);
  assert.doesNotMatch(printedText, /Selected standard driveway option approved/);
  assert.match(printedText, /Sawcut freezer curb/);
  assert.doesNotMatch(printedText, /New scope item|New item|Untitled|Add Alternate 01/);
  assert.doesNotMatch(printedText, /file:\/\/\/C:\/secret/);
});

test("internal review packet can include SOV, takeoff, and internal notes only when explicitly allowed", () => {
  const internalNotes = [
    "Visible office note.",
    "Local file URL should be tracked: file:///C:/secret/internal-margin.xlsx",
    gcPacketLiteBlock({
      proposalSummary: "Customer-safe GC summary.",
      gcReviewNotes: "Office-only GC review note.",
      internalPacketNotes: "Internal packet assembly note.",
    }),
    "[Apex HQ Estimate Backup]",
    JSON.stringify({
      sovRows: [{ section: "Mobilization", description: "Mobilize crew", quantity: "1", unit: "LS", amount: "$1,000", notes: "Office SOV note" }],
      takeoffRows: [{ item: "4 inch sidewalk", quantity: "500", unit: "SF", source: "A1.1", estimatorNote: "Field verify." }],
      referenceRows: [{ fileName: "Bluebeam takeoff screenshot.png", referenceType: "Screenshot", url: "https://files.example.test/takeoff.png", source: "A1.1", notes: "Shows sidewalk SF backup." }],
      notes: "Backup quantity note.",
    }),
    "[/Apex HQ Estimate Backup]",
    "[Apex HQ Sent Proposal History]",
    JSON.stringify([{ snapshotId: "snap-private", notes: "Private sent history" }]),
    "[/Apex HQ Sent Proposal History]",
  ].join("\n");

  const customerFacing = deriveEstimatePrintModel({ internalNotes }, {
    presetId: "internalReviewPacket",
    allowInternalSections: false,
  });
  const customerText = JSON.stringify(customerFacing);
  assert.equal(customerFacing.internalSections.length, 0);
  assert.equal(customerFacing.evidenceSections.some((section) => section.key === "projectTakeoffSummary"), true);
  assert.equal(customerFacing.evidenceSections.some((section) => section.key === "projectReferenceSummary"), true);
  assert.match(customerText, /4 inch sidewalk/);
  assert.match(customerText, /500 SF/);
  assert.match(customerText, /Bluebeam takeoff screenshot/);
  assert.equal(customerText.includes("Office-only GC review note"), false);
  assert.doesNotMatch(customerText, /Field verify/);
  assert.doesNotMatch(customerText, /files\.example\.test\/takeoff/);
  assert.doesNotMatch(customerText, /file:\/\/\/C:\/secret/);
  assert.doesNotMatch(customerText, /Shows sidewalk SF backup/);
  assert.doesNotMatch(customerText, /Backup quantity note/);

  const internal = deriveEstimatePrintModel({ internalNotes }, {
    presetId: "internalReviewPacket",
    allowInternalSections: true,
    customization: {
      themeId: "custom-brand",
      customThemeName: "Office Review",
      headerColor: "#1f2937",
      headerTextColor: "#ffffff",
      accentColor: "#d97706",
      coverTitle: "Internal Bid Review",
      coverKicker: "Office Review Packet",
      tagline: "Estimator backup, scope checks, risks, and handoff notes for office use.",
      statementTitle: "Ready for office review.",
      statementBody: "Scope, pricing summary, SOV backup, takeoff references, internal notes, and review risks are organized for the office team before customer release.",
      reviewNote: "Office-only packet. Do not send to customers or field crews.",
    },
  });
  const printedText = JSON.stringify(internal);

  assert.equal(internal.packetSettings.allowInternalSections, true);
  assert.equal(internal.cover.packetTitle, "Internal Bid Review");
  assert.equal(internal.cover.coverKicker, "Office Review Packet");
  assert.equal(internal.cover.theme.id, "custom-brand");
  assert.equal(internal.cover.theme.accentColor, "#d97706");
  assert.equal(internal.internalSections.some((section) => section.key === "sovBackup"), true);
  assert.equal(internal.internalSections.some((section) => section.key === "takeoffBackup"), true);
  assert.equal(internal.internalSections.some((section) => section.key === "referenceAttachments"), true);
  assert.equal(internal.internalSections.some((section) => section.key === "internalReviewNotes"), true);
  assert.match(printedText, /Mobilization/);
  assert.match(printedText, /4 inch sidewalk/);
  assert.match(printedText, /Bluebeam takeoff screenshot/);
  assert.match(printedText, /Reference link tracked in Apex HQ/);
  assert.doesNotMatch(printedText, /files\.example\.test\/takeoff/);
  assert.match(printedText, /Local file URL should be tracked: Link tracked in Apex HQ/);
  assert.doesNotMatch(printedText, /file:\/\/\/C:\/secret/);
  assert.match(printedText, /Visible office note/);
  assert.match(printedText, /Office-only GC review note/);
  assert.match(printedText, /Internal packet assembly note/);
  assert.match(printedText, /Backup quantity note/);
  assert.doesNotMatch(printedText, /Private sent history/);
  assert.doesNotMatch(printedText, /Apex HQ Sent Proposal History/);

  const defaultInternal = deriveEstimatePrintModel({ internalNotes }, {
    presetId: "internalReviewPacket",
    allowInternalSections: true,
  });
  const defaultInternalText = JSON.stringify(defaultInternal);
  assert.equal(defaultInternal.cover.packetTitle, "Internal Bid Review");
  assert.equal(defaultInternal.cover.coverKicker, "Office Review Packet");
  assert.equal(defaultInternal.cover.statementTitle, "Ready for office review.");
  assert.match(defaultInternal.cover.tagline, /Estimator backup, scope checks, risks, and handoff notes/);
  assert.match(defaultInternal.cover.statementBody, /SOV backup, takeoff references, internal notes, and review risks/);
  assert.equal(defaultInternal.cover.reviewNote, "Office-only packet. Do not send to customers or field crews.");
  assert.equal(defaultInternal.cover.trustCards[0].title, "SOV backup");
  assert.equal(defaultInternal.cover.trustCards[1].title, "Takeoff evidence");
  assert.equal(defaultInternal.cover.trustCards[2].title, "Risk review");
  assert.equal(defaultInternal.cover.trustCards[3].title, "Office-only");
  assert.match(defaultInternalText, /Visible office note/);
  assert.match(defaultInternalText, /Local file URL should be tracked: Link tracked in Apex HQ/);
  assert.match(defaultInternalText, /Office-only GC review note/);
  assert.match(defaultInternalText, /Internal packet assembly note/);
  assert.match(defaultInternalText, /Backup quantity note/);
  assert.match(defaultInternalText, /Reference link tracked in Apex HQ/);
  assert.doesNotMatch(defaultInternalText, /files\.example\.test\/takeoff/);
  assert.doesNotMatch(defaultInternalText, /file:\/\/\/C:\/secret/);
  assert.doesNotMatch(defaultInternalText, /A contractor proposal packet/);
  assert.doesNotMatch(defaultInternalText, /Private sent history|Apex HQ Sent Proposal History/);
});

test("customer evidence includes selected Takeoff Studio proof and hides office-only takeoff rows", () => {
  const internalNotes = [
    "[Apex HQ Estimate Backup]",
    JSON.stringify({
      takeoffRows: [
        { item: "Customer selected slab", quantity: "640", unit: "SF", source: "Apex Takeoff Studio / C2.1" },
        { item: "Estimator-only yield backup", quantity: "8", unit: "CY", source: "Apex Takeoff Studio office-only / C2.1", estimatorNote: "Do not print in customer packet." },
      ],
    }),
    "[/Apex HQ Estimate Backup]",
  ].join("\n");

  const model = deriveEstimatePrintModel({ internalNotes }, {
    presetId: "customerProposalPacket",
  });
  const printedText = JSON.stringify(model);

  assert.equal(model.evidenceSections.some((section) => section.key === "projectTakeoffSummary"), true);
  assert.match(printedText, /Customer selected slab/);
  assert.match(printedText, /640 SF/);
  assert.doesNotMatch(printedText, /Estimator-only yield backup/);
  assert.doesNotMatch(printedText, /Do not print/);
});

test("estimate print model parses alternates and add-ons with conservative selected totals", () => {
  const model = deriveEstimatePrintModel({
    items: [{ description: "Base slab", quantity: 1, unit: "LS", unitPrice: 10000 }],
    customerNotes: [
      "Customer Notes / Terms:",
      "Schedule after approval.",
      "",
      "Alternates:",
      "- [optional] Stamped border | Amount: $1,250.00 | Description: Add stamped border.",
      "- [accepted] Thicker edge | Amount: $900.00",
      "- [excluded] Extra sawcutting | Amount: $300.00",
      "",
      "Optional Add-ons:",
      "- [selected] Sealer | Amount: $450.00",
      "- [included] Extra cleanup | Amount: $125.00",
    ].join("\n"),
  });

  assert.equal(model.options.alternates.length, 3);
  assert.equal(model.options.addOns.length, 2);
  assert.equal(model.options.alternates[0].status, "optional");
  assert.equal(model.options.alternates[1].affectsSelectedTotal, true);
  assert.equal(model.options.alternates[2].affectsSelectedTotal, false);
  assert.equal(model.options.selectedOptionsTotal, 1475);
  assert.equal(model.options.totalWithSelectedOptions, 11475);
});

test("estimate print model keeps old plain estimates safe", () => {
  const model = deriveEstimatePrintModel({
    scopeSummary: "Replace cracked driveway panels.",
    customerNotes: "Estimate is valid for 30 days.",
    items: [],
  });

  assert.equal(model.proposalSections.length, 1);
  assert.equal(model.proposalSections[0].title, "Scope of Work");
  assert.equal(model.proposalSections[0].text, "Replace cracked driveway panels.");
  assert.equal(model.customerNotes, "Estimate is valid for 30 days.");
  assert.equal(model.options.hasSelectedOptionsTotal, false);
  assert.equal(model.lineItems.length, 0);
});
