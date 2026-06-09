import assert from "node:assert/strict";
import test from "node:test";

import {
  APEX_FAMILY_CARE_NOTE_MODEL,
  APEX_FAMILY_CARE_REQUIRED_SCREENS,
  APEX_FAMILY_CARE_SOURCES,
  APEX_FAMILY_CARE_ROUTE_PATH,
  addApexFamilyCareNote,
  buildApexFamilyCareDoctorSummary,
  buildApexFamilyCareFamilySummary,
  buildApexFamilyCareTodaySummary,
  createApexFamilyCareNote,
  detectApexFamilyCareMissingUpdates,
  detectApexFamilyCareRepeatedConcerns,
  getApexFamilyCareAccessGateSummary,
  listApexFamilyCareNotes,
  updateApexFamilyCareNote,
} from "./apexFamilyCare.js";

test("Family Care route and required Phase 1 screens are declared", () => {
  assert.equal(APEX_FAMILY_CARE_ROUTE_PATH, "/family-care");
  assert.deepEqual(APEX_FAMILY_CARE_REQUIRED_SCREENS, [
    "today",
    "add",
    "timeline",
    "doctor",
    "family",
    "settings",
    "access",
    "health",
  ]);
});

test("care notes normalize into compact family care metadata", () => {
  const note = createApexFamilyCareNote({
    category: "pain",
    reporter: "Dad",
    timestamp: "2026-06-09T12:00:00.000Z",
    summary: "Left knee hurt after lunch.",
    severity: "medium",
    bodyArea: "left knee",
    tags: ["knee", "knee", "after lunch"],
  });

  assert.equal(note.subject, "Grandma");
  assert.equal(note.schemaVersion, APEX_FAMILY_CARE_NOTE_MODEL.schemaVersion);
  assert.equal(note.category, "pain");
  assert.equal(note.categoryLabel, "Pain");
  assert.equal(note.addToDoctorSummary, true);
  assert.equal(note.familyVisible, true);
  assert.equal(note.source, "typed");
  assert.equal(note.status, "active");
  assert.deepEqual(note.tags, ["knee", "after lunch"]);
  assert.equal(APEX_FAMILY_CARE_NOTE_MODEL.privacy.rawAudioStored, false);
  assert.equal(APEX_FAMILY_CARE_NOTE_MODEL.privacy.medicalDiagnosis, false);
});

test("care notes support Apex source and medication confirmation-only metadata", () => {
  const note = createApexFamilyCareNote({
    category: "meds",
    reporter: "Brother",
    source: "apex",
    timestamp: "2026-06-09T12:30:00.000Z",
    summary: "Medication was confirmed by Brother.",
    medicationConfirmed: true,
    medicationConfirmedAt: "2026-06-09T12:30:00.000Z",
    medicationConfirmedBy: "Brother",
    medicationConfirmationOnly: true,
  });

  assert.equal(APEX_FAMILY_CARE_SOURCES.includes("apex"), true);
  assert.equal(note.source, "apex");
  assert.equal(note.medicationConfirmed, true);
  assert.equal(note.medicationConfirmedAt, "2026-06-09T12:30:00.000Z");
  assert.equal(note.medicationConfirmedBy, "Brother");
  assert.equal(note.medicationConfirmationOnly, true);
  assert.equal(APEX_FAMILY_CARE_NOTE_MODEL.fields.includes("medicationConfirmationOnly"), true);
});

test("care note add, list, and update helpers keep notes compact and sorted", () => {
  const now = new Date("2026-06-09T14:00:00.000Z");
  const notes = addApexFamilyCareNote([], {
    id: "note-old",
    category: "food",
    timestamp: "2026-06-09T10:00:00.000Z",
    reporter: "Dad",
    summary: "Ate lunch.",
    familyVisible: true,
  }, now);
  const withSecond = addApexFamilyCareNote(notes, {
    id: "note-new",
    category: "pain",
    timestamp: "2026-06-09T13:00:00.000Z",
    reporter: "Brother",
    summary: "Knee hurt after lunch.",
    severity: "medium",
    bodyArea: "knee",
  }, now);

  assert.deepEqual(listApexFamilyCareNotes(withSecond).map((note) => note.id), ["note-new", "note-old"]);
  assert.deepEqual(listApexFamilyCareNotes(withSecond, { category: "pain" }).map((note) => note.id), ["note-new"]);
  assert.deepEqual(listApexFamilyCareNotes(withSecond, { familyVisible: true }).map((note) => note.id), ["note-new", "note-old"]);

  const updated = updateApexFamilyCareNote(withSecond, "note-new", {
    addToDoctorSummary: false,
    familyVisible: false,
    summary: "Knee hurt after lunch; family will watch it.",
  }, new Date("2026-06-09T15:00:00.000Z"));

  assert.equal(updated.changed, true);
  assert.equal(updated.updatedNote.addToDoctorSummary, false);
  assert.equal(updated.updatedNote.familyVisible, false);
  assert.equal(updated.updatedNote.summary, "Knee hurt after lunch; family will watch it.");
  assert.equal(updated.notes.find((note) => note.id === "note-new").updatedAt, "2026-06-09T15:00:00.000Z");
});

test("today, doctor, and family summaries stay practical without medical claims", () => {
  const notes = [
    createApexFamilyCareNote({
      id: "note-1",
      category: "concern",
      reporter: "Brother",
      timestamp: "2026-06-09T09:00:00.000Z",
      summary: "Concern marked for follow-up.",
      severity: "medium",
      familyVisible: true,
    }),
    createApexFamilyCareNote({
      id: "note-2",
      category: "food",
      reporter: "Dad",
      timestamp: "2026-06-09T10:00:00.000Z",
      summary: "Ate a normal lunch.",
      familyVisible: false,
    }),
  ];

  const today = buildApexFamilyCareTodaySummary(notes, new Date("2026-06-09T11:00:00.000Z"));
  const doctor = buildApexFamilyCareDoctorSummary(notes, new Date("2026-06-09T11:00:00.000Z"));
  const family = buildApexFamilyCareFamilySummary(notes, new Date("2026-06-09T11:00:00.000Z"));

  assert.equal(today.noteCount, 2);
  assert.equal(today.todayCount, 2);
  assert.equal(today.openConcernCount, 1);
  assert.equal(today.familyVisibleCount, 1);
  assert.equal(today.missingUpdate.missing, false);
  assert.equal(today.repeatedConcernPatterns.hasRepeatedConcerns, false);
  assert.equal(today.nextBestAction.label, "Doctor prep");
  assert.equal(doctor.itemCount, 1);
  assert.equal(doctor.concernCount, 1);
  assert.equal(doctor.preparedLines.some((line) => line.includes("saved doctor-prep notes")), true);
  assert.match(doctor.safetyLabel, /not diagnosis or treatment instructions/i);
  assert.equal(doctor.safetyLabel.includes("diagnosis"), true);
  assert.equal(family.visibleCount, 1);
  assert.equal(family.headline, "Concern was marked.");
  assert.equal(family.items.some((note) => note.summary === "Ate a normal lunch."), false);
  assert.equal(family.lockScreenSafeNotification, "Concern was marked.");
});

test("missing update detector uses private-safe copy without panic language", () => {
  const result = detectApexFamilyCareMissingUpdates([
    createApexFamilyCareNote({
      id: "note-old-visible",
      category: "normal",
      timestamp: "2026-06-07T09:00:00.000Z",
      summary: "Old check-in.",
      familyVisible: true,
    }),
  ], new Date("2026-06-09T12:00:00.000Z"));

  assert.equal(result.missing, true);
  assert.equal(result.concern, true);
  assert.equal(result.status, "needs-check");
  assert.equal(result.lockScreenSafeNotification, "No update today. Check when convenient.");
  assert.doesNotMatch(result.message, /emergency|diagnos|treatment/i);
});

test("repeated concern detector groups repeated patterns for family and doctor prep", () => {
  const notes = [
    createApexFamilyCareNote({
      id: "knee-1",
      category: "pain",
      timestamp: "2026-06-08T09:00:00.000Z",
      summary: "Knee hurt in the morning.",
      severity: "medium",
      bodyArea: "knee",
    }),
    createApexFamilyCareNote({
      id: "knee-2",
      category: "pain",
      timestamp: "2026-06-09T09:00:00.000Z",
      summary: "Knee hurt again after lunch.",
      severity: "medium",
      bodyArea: "knee",
    }),
    createApexFamilyCareNote({
      id: "sleep-1",
      category: "sleep",
      timestamp: "2026-06-09T07:00:00.000Z",
      summary: "Slept okay.",
      severity: "mild",
    }),
  ];

  const result = detectApexFamilyCareRepeatedConcerns(notes, new Date("2026-06-09T12:00:00.000Z"), { threshold: 2 });

  assert.equal(result.hasRepeatedConcerns, true);
  assert.equal(result.patterns.length, 1);
  assert.equal(result.patterns[0].label, "Pain: knee");
  assert.equal(result.patterns[0].count, 2);
  assert.match(result.patterns[0].doctorPrepPrompt, /next appointment/i);
  assert.doesNotMatch(result.patterns[0].doctorPrepPrompt, /diagnos|treatment/i);
});

test("doctor and family summaries include patterns and missing-update status without raw transcripts", () => {
  const notes = [
    createApexFamilyCareNote({
      id: "mobility-1",
      category: "mobility",
      timestamp: "2026-06-08T10:00:00.000Z",
      summary: "Needed extra time standing up.",
      bodyArea: "legs",
      addToDoctorSummary: true,
      familyVisible: true,
    }),
    createApexFamilyCareNote({
      id: "mobility-2",
      category: "mobility",
      timestamp: "2026-06-09T10:00:00.000Z",
      summary: "Needed extra time again.",
      bodyArea: "legs",
      addToDoctorSummary: true,
      familyVisible: true,
    }),
  ];

  const doctor = buildApexFamilyCareDoctorSummary(notes, new Date("2026-06-09T12:00:00.000Z"));
  const family = buildApexFamilyCareFamilySummary(notes, new Date("2026-06-09T12:00:00.000Z"));

  assert.equal(doctor.patternSummary.hasRepeatedConcerns, true);
  assert.equal(doctor.mobilityCount, 2);
  assert.equal(doctor.sections.some((section) => section.id === "repeated-patterns"), true);
  assert.equal(family.patternSummary.hasRepeatedConcerns, true);
  assert.equal(family.headline, "Repeated care pattern noticed.");
  assert.equal(family.lockScreenSafeNotification, "Repeated care pattern noticed.");
  assert.doesNotMatch(JSON.stringify({ doctor, family }), /raw transcript|raw audio|diagnosis tool/i);
});

test("Family Care access gate defaults closed to public/customer/field exposure", () => {
  assert.deepEqual(getApexFamilyCareAccessGateSummary(), {
    routePrivate: true,
    apexOsOnly: true,
    publicAccess: false,
    customerAccess: false,
    fieldAccess: false,
    rawAudioStored: false,
    rawTranscriptStored: false,
    medicalDiagnosis: false,
    emergencyReplacement: false,
  });
});
