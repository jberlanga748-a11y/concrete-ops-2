import assert from "node:assert/strict";
import test from "node:test";

import {
  APEX_FAMILY_CARE_BRAIN_ACTIONS,
  APEX_FAMILY_CARE_RECEIPT_PRIVACY,
  createApexFamilyCareBrain,
  getApexFamilyCareBrainInterfaceSummary,
} from "./apexFamilyCareBrain.js";

const FIXED_NOW = new Date("2026-06-09T18:00:00.000Z");

function assertPrivateReceipt(receipt, rawText = "private raw phrase") {
  assert.equal(receipt.receiptType, "apex-family-care-brain");
  assert.equal(receipt.localOnly, true);
  assert.equal(receipt.operatorOnly, true);
  assert.equal(receipt.familyCareOnly, true);
  assert.equal(receipt.apexHqProductWork, false);
  assert.equal(receipt.cloudUsed, false);
  assert.equal(receipt.rawPromptStored, false);
  assert.equal(receipt.rawResponseStored, false);
  assert.equal(receipt.rawAudioStored, false);
  assert.equal(receipt.rawTranscriptStored, false);
  assert.equal(receipt.secretsStored, false);
  assert.equal(receipt.customerDataStored, false);
  assert.equal(receipt.medicalDiagnosis, false);
  assert.equal(receipt.emergencyReplacement, false);
  assert.doesNotMatch(JSON.stringify(receipt), new RegExp(rawText, "i"));
}

test("Apex Family Care brain declares the Phase 3 internal interface", () => {
  assert.deepEqual(APEX_FAMILY_CARE_BRAIN_ACTIONS, [
    "logCareNote",
    "getTodayCareStatus",
    "buildDoctorSummary",
    "buildFamilyDigest",
    "listOpenConcerns",
    "markMedicationConfirmed",
  ]);
  assert.equal(APEX_FAMILY_CARE_RECEIPT_PRIVACY.rawPromptStored, false);
  assert.equal(APEX_FAMILY_CARE_RECEIPT_PRIVACY.rawResponseStored, false);

  const summary = getApexFamilyCareBrainInterfaceSummary();
  assert.equal(summary.status, "ready");
  assert.equal(summary.localOnly, true);
  assert.equal(summary.apexHqProductWork, false);
  assert.equal(summary.medicationConfirmationOnly, true);
  assert.equal(summary.medicationControl, false);
});

test("logCareNote lets Apex add compact notes without storing raw text in receipts", () => {
  const brain = createApexFamilyCareBrain([], { now: FIXED_NOW });
  const rawSummary = "Grandma said private raw phrase should not enter receipt.";
  const result = brain.logCareNote({
    id: "brain-pain-1",
    category: "pain",
    reporter: "Dad",
    summary: rawSummary,
    severity: "medium",
    bodyArea: "knee",
    addToDoctorSummary: true,
  });

  assert.equal(result.note.id, "brain-pain-1");
  assert.equal(result.note.source, "apex");
  assert.equal(result.note.summary, rawSummary);
  assert.equal(result.notes.length, 1);
  assert.equal(result.receipt.action, "logCareNote");
  assert.equal(result.receipt.metadata.noteId, "brain-pain-1");
  assert.equal(result.receipt.metadata.category, "pain");
  assertPrivateReceipt(result.receipt);
});

test("Apex brain builds today, doctor, family, and open-concern views", () => {
  const brain = createApexFamilyCareBrain([], { now: FIXED_NOW });
  brain.logCareNote({
    id: "brain-pain-2",
    category: "pain",
    reporter: "Brother",
    timestamp: "2026-06-09T16:00:00.000Z",
    summary: "Knee hurt after lunch.",
    severity: "medium",
    bodyArea: "knee",
    familyVisible: true,
    addToDoctorSummary: true,
  });
  brain.logCareNote({
    id: "brain-food-1",
    category: "food",
    reporter: "Dad",
    timestamp: "2026-06-09T17:00:00.000Z",
    summary: "Ate dinner.",
    familyVisible: true,
  });

  const today = brain.getTodayCareStatus();
  const doctor = brain.buildDoctorSummary();
  const family = brain.buildFamilyDigest();
  const concerns = brain.listOpenConcerns();

  assert.equal(today.todayStatus.noteCount, 2);
  assert.equal(today.todayStatus.todayCount, 2);
  assert.equal(today.todayStatus.openConcernCount, 0);
  assert.equal(doctor.doctorSummary.itemCount, 1);
  assert.equal(doctor.doctorSummary.safetyLabel.includes("not diagnosis"), true);
  assert.equal(family.familyDigest.visibleCount, 2);
  assert.deepEqual(concerns.concerns.map((note) => note.id), ["brain-pain-2"]);

  for (const receipt of [today.receipt, doctor.receipt, family.receipt, concerns.receipt]) {
    assertPrivateReceipt(receipt, "Knee hurt after lunch");
  }
});

test("markMedicationConfirmed creates confirmation-only notes without medication control", () => {
  const brain = createApexFamilyCareBrain([], { now: FIXED_NOW });
  const result = brain.markMedicationConfirmed({
    confirmedBy: "Brother",
    medicationName: "private med name",
    familyVisible: true,
  });

  assert.equal(result.changed, true);
  assert.equal(result.medicationConfirmationOnly, true);
  assert.equal(result.medicationControl, false);
  assert.equal(result.note.category, "meds");
  assert.equal(result.note.source, "apex");
  assert.equal(result.note.medicationConfirmed, true);
  assert.equal(result.note.medicationConfirmedAt, FIXED_NOW.toISOString());
  assert.equal(result.note.medicationConfirmedBy, "Brother");
  assert.equal(result.note.medicationConfirmationOnly, true);
  assert.equal(result.note.summary, "Medication was confirmed by Brother.");
  assert.equal(result.receipt.metadata.medicationConfirmationOnly, true);
  assert.equal(result.receipt.metadata.medicationControl, false);
  assertPrivateReceipt(result.receipt, "private med name");
  assert.equal(result.receipt.medicalDiagnosis, false);
  assert.doesNotMatch(JSON.stringify(result.receipt), /dose|schedule|treatment/i);
});

test("markMedicationConfirmed can update an existing medication note only as confirmation", () => {
  const brain = createApexFamilyCareBrain([
    {
      id: "existing-meds",
      category: "meds",
      reporter: "Dad",
      timestamp: "2026-06-09T12:00:00.000Z",
      summary: "Medication note logged.",
      addToDoctorSummary: true,
    },
  ], { now: FIXED_NOW });

  const result = brain.markMedicationConfirmed({
    noteId: "existing-meds",
    confirmedBy: "Dad",
  });

  assert.equal(result.changed, true);
  assert.equal(result.note.id, "existing-meds");
  assert.equal(result.note.medicationConfirmed, true);
  assert.equal(result.note.medicationConfirmationOnly, true);
  assert.equal(result.note.medicationConfirmedBy, "Dad");
  assert.equal(result.note.tags.includes("medication-confirmed"), true);
  assert.equal(result.medicationControl, false);
  assert.equal(brain.getReceipts()[0].metadata.outcome, "updated");
  assertPrivateReceipt(result.receipt);
});
