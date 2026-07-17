import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { buildEstimatePdfAttachment, buildEstimatePdfBuffer, buildEstimatePdfFilename } from "./estimate-pdf.js";

const SAMPLE_OPTION_IMAGE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

const estimate = {
  title: "Martinez Driveway Proposal",
  createdAt: "2026-05-01T12:00:00.000Z",
  scopeSummary: [
    "Scope of Work:",
    "Replace cracked driveway panels and restore broom-finish apron.",
    "",
    "Inclusions:",
    "Demo, haul-off, forming, placement, and broom finish.",
    "",
    "Exclusions:",
    "Permit fees and utility relocation.",
    "",
    "Assumptions / Clarifications:",
    "Customer will provide clear access before the pour.",
  ].join("\n"),
  internalNotes: [
    "Office-only pricing assumptions stay inside estimates.",
    "[Apex HQ GC Packet Lite]",
    JSON.stringify({
      proposalCoverNote: "Thank you for inviting Apex HQ to price this work.",
      proposalSummary: "GC-facing proposal summary for the driveway scope.",
      qualifications: "Proposal is based on Addendum 01.",
      scheduleNotes: "Schedule will be coordinated with the GC.",
      addendaRfiReferences: "RFI 03 and Addendum 01 reviewed.",
      gcReviewNotes: "Office-only GC strategy.",
      internalPacketNotes: "Internal packet assembly note.",
    }),
    "[/Apex HQ GC Packet Lite]",
    "[Apex HQ Estimate Backup]",
    JSON.stringify({
      takeoffRows: [{ item: "Driveway removal area", quantity: "720", unit: "SF", source: "Site plan A1.1", estimatorNote: "Confirm cracked panel allowance." }],
      referenceRows: [{ fileName: "Driveway takeoff screenshot.png", referenceType: "Takeoff screenshot", url: "https://files.example.test/private/driveway.png", source: "Site plan A1.1", notes: "Office reference note." }],
      notes: "Private SOV backup",
    }),
    "[/Apex HQ Estimate Backup]",
    "[Apex HQ Sent Proposal History]",
    JSON.stringify([{ snapshotId: "snap-private", notes: "Private sent history" }]),
    "[/Apex HQ Sent Proposal History]",
  ].join("\n"),
  customerNotes: [
    "Customer Notes / Terms:",
    "Two-day window once approved.",
    "",
    "Payment Terms:",
    "50% deposit to schedule, balance due at completion.",
    "",
    "Warranty:",
    "Warranty terms are project-specific and exclude normal concrete movement.",
    "",
    "Acceptance / Next Steps:",
    "Signed approval and deposit release scheduling.",
    "",
    "Pricing Options:",
    "- [selected] Standard driveway | Price: $12,500 | Deposit: $3,125 | Final Payment: $9,375 | Description: Broom finish driveway replacement. | Photo: https://cdn.example.test/options/standard.jpg | Caption: Standard broom finish sample.",
    "- [optional] Premium border | Price: $14,850 | Image: file:///C:/secret/premium.jpg | Caption: Decorative border sample.",
    "",
    "Option Photo Pages:",
    `- Cure photo | Photo: ${SAMPLE_OPTION_IMAGE} | Caption: Cure blanket reference. | Notes: Visual reference only.`,
    "",
    "Concrete Specifications:",
    "- Thickness: 4 inch slab with thickened driveway approach edge.",
    "- Finish: Broom finish with sawcut control joints.",
    "- Concrete Strength: 4000 PSI ready-mix with fiber reinforcement.",
    "",
    "Residential Legal Notices:",
    "Owner is responsible for utility locates, irrigation lines, and required HOA approvals.",
    "",
    "Customer Approval:",
    "Selected standard driveway option approved by Jamie Martinez on 5/20/2026.",
    "",
    "Alternates:",
    "- [optional] Stamped border | Amount: $1,250.00 | Description: Add stamped border.",
    "- [accepted] Thicker driveway edge | Amount: $900.00",
    "",
    "Optional Add-ons:",
    "- [selected] Sealer | Amount: $450.00",
    "- [excluded] Extra sawcutting | Amount: $300.00",
  ].join("\n"),
  customer: { name: "Martinez Residence" },
  lead: { customer: "Martinez Residence", project: "Driveway replacement estimate" },
  items: [
    { description: "Concrete placement", quantity: 10, unit: "yd", unitPrice: 185 },
    { description: "Prep and cleanup", quantity: 1, unit: "lot", unitPrice: 650 },
  ],
  taxRate: 8.5,
  feesTotal: 125,
};

function extractPdfText(buffer) {
  return Array.from(buffer.toString("latin1").matchAll(/<([0-9A-Fa-f]+)>/g))
    .map((match) => Buffer.from(match[1], "hex").toString("latin1"))
    .join("")
    .replace(/\s+/g, " ");
}

test("estimate PDF attachment uses a safe customer and project filename", () => {
  assert.equal(
    buildEstimatePdfFilename({
      ...estimate,
      customer: { name: "Martinez / Residence LLC" },
      lead: { customer: "Martinez / Residence LLC", project: "Driveway replacement: phase #1" },
    }),
    "Estimate-Martinez-Residence-LLC-Driveway-replacement-phase-1.pdf",
  );
});

test("estimate PDF attachment includes customer-facing proposal details only", async () => {
  const attachment = await buildEstimatePdfAttachment({
    companyName: "Apex HQ Demo Company",
    companyProfile: {
      logoInitials: "CO",
      businessPhone: "(503) 555-0100",
      businessEmail: "office@apexhqdemo.com",
      website: "https://apexhqdemo.com",
      businessAddress: "1840 River Rd S, Salem, OR 97302",
      serviceArea: "Willamette Valley",
      licenseText: "CCB #123456 - Bonded and insured.",
    },
    printPacketFooter: "Generated by Apex HQ for estimate review.",
    printPacketDisclaimer: "Review before sharing outside the company.",
    estimate,
  });
  const pdfText = attachment.content.toString("latin1");
  const decodedText = extractPdfText(attachment.content);

  assert.equal(attachment.filename, "Estimate-Martinez-Residence-Driveway-replacement-estimate.pdf");
  assert.equal(attachment.contentType, "application/pdf");
  assert.match(pdfText, /%PDF-1\.3/);
  assert.match(decodedText, /Apex HQ Demo Company/);
  assert.match(decodedText, /CO/);
  assert.match(decodedText, /503/);
  assert.match(decodedText, /office@apexhqdemo\.com/);
  assert.match(decodedText, /1840 River Rd S, Salem, OR 97302/);
  assert.match(decodedText, /CCB #123456 - Bonded and insured\./);
  assert.match(decodedText, /ESTIMATE/);
  assert.doesNotMatch(decodedText, /WHY THIS PACKET IS READY/);
  assert.doesNotMatch(decodedText, /GC \/ Prime Proposal/);
  assert.doesNotMatch(decodedText, /CONCRETE/);
  assert.doesNotMatch(decodedText, /award review/);
  assert.match(decodedText, /PREPARED FOR/);
  assert.match(decodedText, /5\/1\/2026/);
  assert.match(decodedText, /VALID THROUGH/);
  assert.match(decodedText, /5\/31\/2026/);
  assert.match(decodedText, /Martinez Driveway Proposal/);
  assert.match(decodedText, /Martinez Residence/);
  assert.match(decodedText, /Driveway replacement estimate/);
  assert.match(decodedText, /Base estimate total/);
  assert.match(decodedText, /\$2,837\.50/);
  assert.match(decodedText, /SCOPE OF WORK/);
  assert.match(decodedText, /Replace cracked driveway panels/);
  assert.match(decodedText, /INCLUSIONS/);
  assert.match(decodedText, /Demo, haul-off, forming, placement, and broom finish\./);
  assert.match(decodedText, /EXCLUSIONS/);
  assert.match(decodedText, /Permit fees and utility relocation\./);
  assert.match(decodedText, /ASSUMPTIONS \/ CLARIFICATIONS/);
  assert.match(decodedText, /PROPOSAL COVER NOTE/);
  assert.match(decodedText, /Thank you for inviting Apex HQ/);
  assert.match(decodedText, /PROPOSAL SUMMARY/);
  assert.match(decodedText, /GC-facing proposal summary/);
  assert.match(decodedText, /QUALIFICATIONS/);
  assert.match(decodedText, /Proposal is based on Addendum 01/);
  assert.match(decodedText, /SCHEDULE NOTES/);
  assert.match(decodedText, /Schedule will be coordinated with the GC/);
  assert.doesNotMatch(decodedText, /ADDENDA \/ RFI REFERENCES/);
  assert.doesNotMatch(decodedText, /RFI 03 and Addendum 01 reviewed/);
  assert.match(decodedText, /PROJECT TAKEOFF SUMMARY/);
  assert.match(decodedText, /Driveway removal area/);
  assert.match(decodedText, /720 SF/);
  assert.match(decodedText, /Source Site plan A1\.1/);
  assert.match(decodedText, /PROJECT REFERENCES/);
  assert.match(decodedText, /Driveway takeoff screenshot\.png/);
  assert.match(decodedText, /Type Takeoff screenshot/);
  assert.match(decodedText, /DESCRIPTION/);
  assert.match(decodedText, /QTY/);
  assert.match(decodedText, /UNIT PRICE/);
  assert.match(decodedText, /AMOUNT/);
  assert.match(decodedText, /Concrete placement/);
  assert.match(decodedText, /10/);
  assert.match(decodedText, /\$185\.00/);
  assert.match(decodedText, /Subtotal/);
  assert.match(decodedText, /\$2,500\.00/);
  assert.match(decodedText, /Tax \(8\.5%\)/);
  assert.match(decodedText, /\$212\.50/);
  assert.match(decodedText, /Fees/);
  assert.match(decodedText, /\$125\.00/);
  assert.match(decodedText, /ALTERNATES/);
  assert.match(decodedText, /Stamped border/);
  assert.match(decodedText, /Thicker driveway edge/);
  assert.match(decodedText, /OPTIONAL ADD-ONS/);
  assert.match(decodedText, /Sealer/);
  assert.match(decodedText, /Selected options total/);
  assert.match(decodedText, /TOTAL WITH SELECTED OPTIONS/);
  assert.match(decodedText, /\$4,187\.50/);
  assert.match(decodedText, /CUSTOMER NOTES \/ TERMS/);
  assert.match(decodedText, /Two-day window once approved\./);
  assert.match(decodedText, /PAYMENT TERMS/);
  assert.match(decodedText, /50% deposit to schedule/);
  assert.match(decodedText, /WARRANTY \/ WORKMANSHIP NOTES/);
  assert.match(decodedText, /Warranty terms are project-specific/);
  assert.match(decodedText, /ACCEPTANCE \/ NEXT STEPS/);
  assert.match(decodedText, /Signed approval and deposit release scheduling/);
  assert.match(decodedText, /CUSTOMER PRICING OPTIONS/);
  assert.match(decodedText, /Standard driveway/);
  assert.match(decodedText, /Down payment \$3,125\.00/);
  assert.match(decodedText, /Final payment \$9,375\.00/);
  assert.match(decodedText, /OPTION \/ FINISH REFERENCES/);
  assert.match(decodedText, /Cure blanket reference/);
  assert.match(pdfText, /\/Subtype \/Image/);
  assert.match(decodedText, /PROJECT SPECIFICATIONS/);
  assert.match(decodedText, /Thickness/);
  assert.match(decodedText, /Broom finish with sawcut control joints\./);
  assert.match(decodedText, /4000 PSI ready-mix/);
  assert.match(decodedText, /thanks you for the opportunity to earn your business\./);
  assert.doesNotMatch(decodedText, /Generated by Apex HQ for estimate review\./);
  assert.doesNotMatch(decodedText, /Review before sharing outside the company\./);
  assert.doesNotMatch(decodedText, /Office-only pricing assumptions/);
  assert.doesNotMatch(decodedText, /Office-only GC strategy/);
  assert.doesNotMatch(decodedText, /Internal packet assembly note/);
  assert.doesNotMatch(decodedText, /Private SOV backup/);
  assert.doesNotMatch(decodedText, /files\.example\.test/);
  assert.doesNotMatch(decodedText, /cdn\.example\.test\/options/);
  assert.doesNotMatch(decodedText, /file:\/\/\/C:\/secret/);
  assert.doesNotMatch(decodedText, /Confirm cracked panel allowance/);
  assert.doesNotMatch(decodedText, /Office reference note/);
  assert.doesNotMatch(decodedText, /Private sent history/);
  assert.doesNotMatch(decodedText, /Apex HQ GC Packet Lite/);
  assert.doesNotMatch(decodedText, /RESIDENTIAL LEGAL NOTICES/);
  assert.doesNotMatch(decodedText, /Owner is responsible for utility locates/);
  assert.doesNotMatch(decodedText, /CUSTOMER APPROVAL RECORD/);
  assert.doesNotMatch(decodedText, /Selected standard driveway option approved/);
  assert.doesNotMatch(decodedText, /ACCEPTED BY/);
  assert.doesNotMatch(decodedText, /SIGNATURE/);
});

test("estimate PDF draws acceptance signature block only for residential approval packets", async () => {
  const buffer = await buildEstimatePdfBuffer({
    estimate,
    packetSettings: {
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
    },
  });
  const decodedText = extractPdfText(buffer);

  assert.match(decodedText, /ESTIMATE/);
  assert.match(decodedText, /CUSTOMER APPROVAL RECORD/);
  assert.match(decodedText, /ACCEPTED BY/);
  assert.match(decodedText, /SIGNATURE/);
});

test("residential proposal PDF defaults to homeowner-ready cover language", async () => {
  const buffer = await buildEstimatePdfBuffer({
    companyName: "Yard Concrete Co.",
    companyProfile: {
      logoInitials: "YC",
      printPacketHeaderColor: "#102a43",
      printPacketHeaderTextColor: "#f8fafc",
      printPacketAccentColor: "#0f766e",
    },
    estimate,
    packetSettings: { presetId: "residentialProposalPacket" },
  });
  const decodedText = extractPdfText(buffer);

  assert.match(decodedText, /ESTIMATE/);
  assert.match(decodedText, /CUSTOMER APPROVAL RECORD/);
  assert.match(decodedText, /ACCEPTED BY/);
  assert.doesNotMatch(decodedText, /contractor proposal packet/);
  assert.doesNotMatch(decodedText, /WHY THIS PACKET IS READY/);
});

test("GC prime proposal PDF defaults to bid package language", async () => {
  const buffer = await buildEstimatePdfBuffer({
    companyName: "Yard Concrete Co.",
    companyProfile: {
      logoInitials: "YC",
      printPacketHeaderColor: "#0f2742",
      printPacketHeaderTextColor: "#f8fafc",
      printPacketAccentColor: "#2563eb",
    },
    estimate,
    packetSettings: { presetId: "gcPrimeProposalPacket" },
  });
  const decodedText = extractPdfText(buffer);

  assert.match(decodedText, /GC \/ prime proposal packet/);
  assert.match(decodedText, /ADDENDA \/ RFI/);
  assert.match(decodedText, /RFI 03 and Addendum 01 reviewed/);
  assert.doesNotMatch(decodedText, /contractor proposal packet/);
  assert.doesNotMatch(decodedText, /Ready for award review/);
});

test("estimate PDF applies GC prime packet customization", async () => {
  const buffer = await buildEstimatePdfBuffer({
    companyName: "Builders Concrete Co.",
    companyProfile: {
      logoInitials: "BCC",
      businessEmail: "estimating@builders.test",
    },
    estimate,
    packetSettings: {
      presetId: "gcPrimeProposalPacket",
      customization: {
        themeId: "custom-brand",
        customThemeName: "Berlanda Concrete",
        headerColor: "#123abc",
        headerTextColor: "#fefefe",
        accentColor: "#00aa88",
        coverTitle: "Prime Bid Package",
        coverKicker: "Concrete Bid",
        tagline: "Built for GC review.",
        statementTitle: "Ready for award review.",
        statementBody: "Custom scope, alternates, and closeout expectations are organized for the GC team.",
        reviewNote: "Confirm addenda and inclusions before award.",
      },
    },
  });
  const decodedText = extractPdfText(buffer);

  assert.match(decodedText, /ESTIMATE/);
  assert.match(decodedText, /GC \/ prime proposal packet/);
  assert.match(decodedText, /ADDENDA \/ RFI REFERENCES/);
  assert.match(decodedText, /RFI 03 and Addendum 01 reviewed/);
  assert.doesNotMatch(decodedText, /Prime Bid Package|Built for GC review|Ready for award review/);
});

test("estimate PDF applies commercial subcontractor packet customization", async () => {
  const buffer = await buildEstimatePdfBuffer({
    companyName: "Pacific Flatwork Co.",
    companyProfile: {
      logoInitials: "PF",
      businessEmail: "bids@pacificflatwork.test",
    },
    estimate,
    packetSettings: {
      presetId: "commercialSubcontractorPacket",
      customization: {
        themeId: "custom-brand",
        customThemeName: "Pacific Flatwork Commercial",
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
    },
  });
  const decodedText = extractPdfText(buffer);

  assert.match(decodedText, /Subcontractor proposal packet/i);
  assert.doesNotMatch(decodedText, /Commercial Sub Bid|Ready for subcontract review/);
  assert.doesNotMatch(decodedText, /CUSTOMER APPROVAL RECORD/);
  assert.doesNotMatch(decodedText, /RESIDENTIAL LEGAL NOTICES/);
  assert.doesNotMatch(decodedText, /Office-only|Internal packet assembly note|Private SOV backup|Private sent history/);
  assert.doesNotMatch(decodedText, /files\.example\.test|Apex HQ Estimate Backup|Apex HQ GC Packet Lite/);
});

test("estimate PDF uses polished commercial subcontractor packet defaults", async () => {
  const buffer = await buildEstimatePdfBuffer({
    companyName: "Pacific Flatwork Co.",
    companyProfile: {
      logoInitials: "PF",
      businessEmail: "bids@pacificflatwork.test",
    },
    estimate,
    packetSettings: {
      presetId: "commercialSubcontractorPacket",
    },
  });
  const decodedText = extractPdfText(buffer);

  assert.match(decodedText, /Subcontractor proposal packet/i);
  assert.match(decodedText, /SCOPE OF WORK/);
  assert.match(decodedText, /PAYMENT TERMS/);
  assert.doesNotMatch(decodedText, /Commercial Sub Bid|Ready for subcontract review/);
  assert.doesNotMatch(decodedText, /A contractor proposal packet/i);
  assert.doesNotMatch(decodedText, /CUSTOMER APPROVAL RECORD/);
  assert.doesNotMatch(decodedText, /RESIDENTIAL LEGAL NOTICES/);
  assert.doesNotMatch(decodedText, /Office-only|Internal packet assembly note|Private SOV backup|Private sent history/);
  assert.doesNotMatch(decodedText, /files\.example\.test|Apex HQ Estimate Backup|Apex HQ GC Packet Lite/);
});

test("estimate PDF packet settings hide GC Lite sections for basic estimate preset", async () => {
  const buffer = await buildEstimatePdfBuffer({
    estimate,
    packetSettings: {
      presetId: "basicEstimate",
    },
  });
  const decodedText = extractPdfText(buffer);

  assert.match(decodedText, /SCOPE OF WORK/);
  assert.match(decodedText, /ALTERNATES/);
  assert.doesNotMatch(decodedText, /PROPOSAL COVER NOTE/);
  assert.doesNotMatch(decodedText, /GC-facing proposal summary/);
  assert.doesNotMatch(decodedText, /Office-only GC strategy/);
});

test("estimate PDF applies saved company packet brand colors by default", () => {
  const source = fs.readFileSync(new URL("./estimate-pdf.js", import.meta.url), "utf8");

  assert.match(source, /CUSTOM_ESTIMATE_PACKET_THEME_ID/);
  assert.match(source, /function applyCompanyProfilePacketTheme/);
  assert.match(source, /companyProfile\.printPacketHeaderColor/);
  assert.match(source, /companyProfile\.printPacketHeaderTextColor/);
  assert.match(source, /companyProfile\.printPacketAccentColor/);
  assert.match(source, /companyProfile\.printPacketAccentDarkColor/);
  assert.match(source, /companyProfile\.printPacketAccentSoftColor/);
  assert.match(source, /deriveEstimatePrintModel\(estimate, applyCompanyProfilePacketTheme\(packetSettings, companyProfile\)\)/);
});

test("polished estimate sheet PDF uses estimate language instead of proposal cover language", async () => {
  const buffer = await buildEstimatePdfBuffer({
    companyName: "Yard Concrete Co.",
    companyProfile: {
      logoInitials: "YC",
      printPacketHeaderColor: "#102a43",
      printPacketHeaderTextColor: "#f8fafc",
      printPacketAccentColor: "#0f766e",
    },
    estimate,
    packetSettings: { presetId: "polishedEstimateSheet" },
  });
  const decodedText = extractPdfText(buffer);

  assert.match(decodedText, /ESTIMATE/);
  assert.match(decodedText, /Customer estimate sheet/);
  assert.match(decodedText, /Yard Concrete Co\. thanks you for the opportunity/);
  assert.doesNotMatch(decodedText, /CONCRETE PR OPOSAL/);
  assert.doesNotMatch(decodedText, /Yard Concrete Co\. proposal packet\./);
  assert.doesNotMatch(decodedText, /WHY THIS PACKET IS READY|WHY THIS ESTIMATE IS READY/);
});

test("estimate PDF internal review packet can include office-only backup when explicitly allowed", async () => {
  const buffer = await buildEstimatePdfBuffer({
    estimate: {
      title: "Internal Review Estimate",
      scopeSummary: "Scope of Work:\nPlace site concrete.",
      internalNotes: [
        "Visible office note.",
        "Local file URL should be tracked: file:///C:/secret/internal-margin.xlsx",
        "[Apex HQ GC Packet Lite]",
        JSON.stringify({
          proposalSummary: "GC proposal summary.",
          gcReviewNotes: "Office-only GC note.",
          internalPacketNotes: "Internal packet note.",
        }),
        "[/Apex HQ GC Packet Lite]",
        "[Apex HQ Estimate Backup]",
        JSON.stringify({
          sovRows: [{ section: "Mobilization", description: "Mobilize crew", quantity: "1", unit: "LS", amount: "$1,000" }],
          takeoffRows: [{ item: "Sidewalk", quantity: "500", unit: "SF", source: "A1.1", estimatorNote: "Field verify." }],
          notes: "Backup note.",
        }),
        "[/Apex HQ Estimate Backup]",
      ].join("\n"),
      items: [],
    },
    packetSettings: {
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
    },
  });
  const decodedText = extractPdfText(buffer);

  assert.match(decodedText, /INTERNAL REVIEW/);
  assert.match(decodedText, /Internal review packet/);
  assert.match(decodedText, /SCHEDULE OF VALUES BACKUP/);
  assert.match(decodedText, /Mobilization/);
  assert.match(decodedText, /TAKEOFF BACKUP/);
  assert.match(decodedText, /Sidewalk/);
  assert.match(decodedText, /INTERNAL REVIEW NOTES/);
  assert.match(decodedText, /Visible office note/);
  assert.match(decodedText, /Local file URL should be tracked: Link tracked in Apex HQ/);
  assert.match(decodedText, /Office-only GC note/);
  assert.match(decodedText, /Internal packet note/);
  assert.match(decodedText, /Backup note/);
});

test("estimate PDF internal review packet uses polished office-review defaults", async () => {
  const buffer = await buildEstimatePdfBuffer({
    estimate: {
      title: "Internal Review Estimate",
      createdAt: "2026-05-27T12:00:00.000Z",
      scopeSummary: "Scope of Work:\nPlace concrete.\n\nExclusions:\nTesting by others.",
      internalNotes: [
        "Visible office note.",
        "Local file URL should be tracked: file:///C:/secret/internal-margin.xlsx",
        "[Apex HQ GC Packet Lite]",
        JSON.stringify({
          proposalSummary: "GC proposal summary.",
          gcReviewNotes: "Office-only GC note.",
          internalPacketNotes: "Internal packet note.",
        }),
        "[/Apex HQ GC Packet Lite]",
        "[Apex HQ Estimate Backup]",
        JSON.stringify({
          sovRows: [{ section: "Mobilization", description: "Mobilize crew", quantity: "1", unit: "LS", amount: "$1,000" }],
          takeoffRows: [{ item: "Sidewalk", quantity: "500", unit: "SF", source: "A1.1", estimatorNote: "Field verify." }],
          referenceRows: [{ fileName: "Bluebeam slab screenshot.png", referenceType: "Screenshot", url: "https://files.example.test/slab.png", source: "A1.1", notes: "Plan takeoff reference." }],
          notes: "Backup note.",
        }),
        "[/Apex HQ Estimate Backup]",
        "[Apex HQ Sent Proposal History]",
        JSON.stringify([{ snapshotId: "snap-private", notes: "Private sent history" }]),
        "[/Apex HQ Sent Proposal History]",
      ].join("\n"),
      items: [{ description: "Base slab", quantity: 1, unit: "LS", unitPrice: 10000 }],
    },
    packetSettings: {
      presetId: "internalReviewPacket",
      allowInternalSections: true,
    },
  });
  const decodedText = extractPdfText(buffer);

  assert.match(decodedText, /INTERNAL REVIEW/);
  assert.match(decodedText, /Internal review packet/);
  assert.match(decodedText, /internal review packet\./);
  assert.match(decodedText, /SCHEDULE OF VALUES BACKUP/);
  assert.match(decodedText, /Bluebeam slab screenshot/);
  assert.match(decodedText, /Visible office note/);
  assert.match(decodedText, /Office-only GC note/);
  assert.match(decodedText, /Internal packet note/);
  assert.match(decodedText, /Backup note/);
  assert.match(decodedText, /Field verify/);
  assert.match(decodedText, /Plan takeoff reference/);
  assert.match(decodedText, /Reference link tracked in Apex HQ/);
  assert.doesNotMatch(decodedText, /A contractor proposal packet/i);
  assert.doesNotMatch(decodedText, /files\.example\.test\/slab/);
  assert.doesNotMatch(decodedText, /file:\/\/\/C:\/secret/);
  assert.doesNotMatch(decodedText, /PROPOSAL DATE|Review proposal options|Apex HQ Workspace proposal packet/);
  assert.doesNotMatch(decodedText, /Private sent history|Apex HQ Sent Proposal History/);
});

test("estimate PDF renders an uploaded logo and falls back to initials when absent or invalid", async () => {
  const logoEstimate = {
    title: "Logo Test Proposal",
    createdAt: "2026-05-01T12:00:00.000Z",
    scopeSummary: "Scope of Work:\nInstall cedar fence.",
    customerNotes: "Customer Notes / Terms:\nValid for 30 days.",
    items: [{ description: "Fence install", quantity: 1, unit: "LS", unitPrice: 5000 }],
  };

  // With an uploaded PNG logo: the image is embedded and the initials mark is not drawn.
  const withLogo = await buildEstimatePdfBuffer({
    companyName: "Zeta Fence Co.",
    companyProfile: { logoInitials: "ZZQ", logoImageUrl: SAMPLE_OPTION_IMAGE },
    estimate: logoEstimate,
  });
  assert.match(withLogo.toString("latin1"), /\/Subtype \/Image/);
  assert.doesNotMatch(extractPdfText(withLogo), /ZZQ/);

  // Without a logo: no embedded image, initials mark renders.
  const withoutLogo = await buildEstimatePdfBuffer({
    companyName: "Zeta Fence Co.",
    companyProfile: { logoInitials: "ZZQ" },
    estimate: logoEstimate,
  });
  assert.doesNotMatch(withoutLogo.toString("latin1"), /\/Subtype \/Image/);
  assert.match(extractPdfText(withoutLogo), /ZZQ/);

  // With an invalid logo value: silently falls back to the initials mark.
  const withBadLogo = await buildEstimatePdfBuffer({
    companyName: "Zeta Fence Co.",
    companyProfile: { logoInitials: "ZZQ", logoImageUrl: "data:image/png;base64,not-a-real-image" },
    estimate: logoEstimate,
  });
  assert.doesNotMatch(withBadLogo.toString("latin1"), /\/Subtype \/Image/);
  assert.match(extractPdfText(withBadLogo), /ZZQ/);
});
