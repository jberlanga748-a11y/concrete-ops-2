import assert from "node:assert/strict";
import test from "node:test";

import {
  APEX_FAMILY_CARE_BRAIN_ACTIONS,
  APEX_FAMILY_CARE_COORDINATOR_POLICY,
  APEX_FAMILY_CARE_RECEIPT_PRIVACY,
  buildApexFamilyCareCoordinatorPacket,
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
    "buildCareCoordinatorPacket",
    "markMedicationConfirmed",
  ]);
  assert.equal(APEX_FAMILY_CARE_RECEIPT_PRIVACY.rawPromptStored, false);
  assert.equal(APEX_FAMILY_CARE_RECEIPT_PRIVACY.rawResponseStored, false);
  assert.equal(APEX_FAMILY_CARE_COORDINATOR_POLICY.humanReviewRequired, true);
  assert.equal(APEX_FAMILY_CARE_COORDINATOR_POLICY.autoSend, false);

  const summary = getApexFamilyCareBrainInterfaceSummary();
  assert.equal(summary.status, "ready");
  assert.equal(summary.localOnly, true);
  assert.equal(summary.apexHqProductWork, false);
  assert.equal(summary.humanReviewRequired, true);
  assert.equal(summary.autoSend, false);
  assert.equal(summary.medicationConfirmationOnly, true);
  assert.equal(summary.medicationControl, false);
});

test("care coordinator packet suggests human-reviewed prompts without sends or raw receipt text", () => {
  const packet = buildApexFamilyCareCoordinatorPacket([
    {
      id: "coordinator-concern",
      category: "concern",
      reporter: "Dad",
      timestamp: "2026-06-09T14:00:00.000Z",
      summary: "private raw phrase concern should not enter receipt",
      severity: "severe",
      familyVisible: true,
      urgent: true,
      addToDoctorSummary: true,
    },
    {
      id: "coordinator-pain",
      category: "pain",
      reporter: "Brother",
      timestamp: "2026-06-09T15:00:00.000Z",
      summary: "private raw phrase missing detail should not enter receipt",
      severity: "unknown",
      bodyArea: "",
      familyVisible: true,
      addToDoctorSummary: true,
    },
    {
      id: "coordinator-meds",
      category: "meds",
      reporter: "Dad",
      timestamp: "2026-06-09T16:00:00.000Z",
      summary: "private med name should not enter receipt",
      familyVisible: true,
      addToDoctorSummary: true,
      medicationConfirmed: false,
    },
    {
      id: "coordinator-review",
      category: "sleep",
      reporter: "Family",
      timestamp: "2026-06-09T17:00:00.000Z",
      summary: "private raw phrase review should not enter receipt",
      status: "needs-review",
      familyVisible: true,
      addToDoctorSummary: true,
    },
  ], { now: FIXED_NOW });

  assert.equal(packet.packetType, "apex-family-care-coordinator-packet");
  assert.equal(packet.policy.humanReviewRequired, true);
  assert.equal(packet.policy.autoSend, false);
  assert.equal(packet.policy.smsSent, false);
  assert.equal(packet.policy.emailSent, false);
  assert.equal(packet.policy.pushSent, false);
  assert.equal(packet.policy.cloudUsed, false);
  assert.equal(packet.policy.medicationConfirmationOnly, true);
  assert.equal(packet.policy.medicationControl, false);
  assert.equal(packet.policy.dosingAdvice, false);
  assert.equal(packet.policy.treatmentInstructions, false);
  assert.equal(packet.summary.openConcernCount, 1);
  assert.equal(packet.summary.doctorPrepPromptCount >= 2, true);
  assert.equal(packet.summary.medicationReviewCount, 1);
  assert.equal(packet.summary.needsReviewCount, 1);
  assert.equal(packet.prompts.some((prompt) => prompt.id === "review-flagged-notes"), true);
  assert.equal(packet.prompts.every((prompt) => prompt.humanReviewRequired && !prompt.autoSend && !prompt.medicationControl), true);
  assert.match(JSON.stringify(packet.medicationReviewPrompts), /Do not suggest dose, schedule, or treatment changes/);

  assert.equal(packet.receipt.receiptType, "apex-family-care-coordinator-packet");
  assert.equal(packet.receipt.localOnly, true);
  assert.equal(packet.receipt.familyCareOnly, true);
  assert.equal(packet.receipt.apexHqProductWork, false);
  assert.equal(packet.receipt.rawPromptStored, false);
  assert.equal(packet.receipt.rawResponseStored, false);
  assert.equal(packet.receipt.rawAudioStored, false);
  assert.equal(packet.receipt.rawTranscriptStored, false);
  assert.equal(packet.receipt.rawNoteTextStoredInReceipt, false);
  assert.equal(packet.receipt.metadata.coordinatorPromptCount, packet.prompts.length);
  assert.equal(packet.receipt.metadata.autoSend, false);
  assert.equal(packet.receipt.metadata.humanReviewRequired, true);
  assert.doesNotMatch(JSON.stringify(packet.receipt), /private raw phrase|private med name/i);
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

test("Apex brain builds care coordinator packet receipts while preserving review states", () => {
  const brain = createApexFamilyCareBrain([
    {
      id: "brain-review-state",
      category: "pain",
      reporter: "Dad",
      timestamp: "2026-06-09T12:00:00.000Z",
      summary: "private raw phrase in review note",
      status: "needs-review",
      addToDoctorSummary: true,
      familyVisible: true,
    },
    {
      id: "brain-active-concern",
      category: "concern",
      reporter: "Brother",
      timestamp: "2026-06-09T13:00:00.000Z",
      summary: "private raw phrase in concern note",
      severity: "severe",
      urgent: true,
      addToDoctorSummary: true,
      familyVisible: true,
    },
  ], { now: FIXED_NOW });

  const result = brain.buildCareCoordinatorPacket();

  assert.equal(result.coordinatorPacket.summary.needsReviewCount, 1);
  assert.equal(result.coordinatorPacket.summary.openConcernCount, 1);
  assert.equal(result.coordinatorPacket.policy.autoSend, false);
  assert.equal(result.coordinatorPacket.policy.medicationControl, false);
  assert.equal(result.receipt.action, "buildCareCoordinatorPacket");
  assert.equal(result.receipt.metadata.needsReviewCount, 1);
  assert.equal(result.receipt.metadata.openConcernPromptCount, 1);
  assert.equal(result.receipt.metadata.humanReviewRequired, true);
  assert.equal(brain.getReceipts()[0].action, "buildCareCoordinatorPacket");
  assertPrivateReceipt(result.receipt, "private raw phrase");
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
