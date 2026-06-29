import assert from "node:assert/strict";
import test from "node:test";

import {
  APEX_FAMILY_CARE_BOUNDARY_RELEASE_POLICY,
  APEX_FAMILY_CARE_LOCAL_RELEASE_SMOKE_POLICY,
  APEX_FAMILY_CARE_NOTE_MODEL,
  APEX_FAMILY_CARE_NOTE_STATUSES,
  APEX_FAMILY_CARE_REQUIRED_SCREENS,
  APEX_FAMILY_CARE_SOURCES,
  APEX_FAMILY_CARE_ROUTE_PATH,
  addApexFamilyCareNote,
  buildApexFamilyCareAccessReadiness,
  buildApexFamilyCareBoundaryReleasePrep,
  buildApexFamilyCareLocalReleaseSmokeChecklist,
  buildApexFamilyCareDoctorSummary,
  buildApexFamilyCareFamilySummary,
  buildApexFamilyCareReviewState,
  buildApexFamilyCareTodaySummary,
  createApexFamilyCareNote,
  detectApexFamilyCareMissingUpdates,
  detectApexFamilyCareRepeatedConcerns,
  getApexFamilyCareAccessGateSummary,
  listApexFamilyCareNotes,
  reviseApexFamilyCareNote,
  updateApexFamilyCareNote,
} from "./apexFamilyCare.js";

test("Family Care route and required Phase 1 screens are declared", () => {
  assert.equal(APEX_FAMILY_CARE_ROUTE_PATH, "/family-care");
  assert.deepEqual(APEX_FAMILY_CARE_REQUIRED_SCREENS, [
    "today",
    "kitchen",
    "add",
    "voice",
    "timeline",
    "doctor",
    "family",
    "settings",
    "testWeek",
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

test("care note review and archive states stay local and outside default summaries", () => {
  assert.deepEqual(APEX_FAMILY_CARE_NOTE_STATUSES, ["active", "confirmed", "needs-review", "archived"]);
  const now = new Date("2026-06-09T14:00:00.000Z");
  const active = createApexFamilyCareNote({
    id: "active-note",
    category: "normal",
    timestamp: "2026-06-09T10:00:00.000Z",
    summary: "Normal morning check-in.",
  }, now);
  const confirmed = createApexFamilyCareNote({
    id: "confirmed-note",
    category: "normal",
    timestamp: "2026-06-09T10:30:00.000Z",
    summary: "Family confirmed this check-in.",
    status: "confirmed",
    reviewConfirmedAt: "2026-06-09T12:00:00.000Z",
    reviewConfirmedBy: "Dad",
  }, now);
  const review = createApexFamilyCareNote({
    id: "review-note",
    category: "pain",
    timestamp: "2026-06-09T11:00:00.000Z",
    summary: "Knee note needs family review before using.",
    addToDoctorSummary: true,
    status: "needs-review",
  }, now);
  const archived = createApexFamilyCareNote({
    id: "archived-note",
    category: "food",
    timestamp: "2026-06-09T12:00:00.000Z",
    summary: "Mistaken duplicate lunch note.",
    status: "archived",
  }, now);
  const notes = [active, confirmed, review, archived];

  assert.deepEqual(listApexFamilyCareNotes(notes).map((note) => note.id), ["confirmed-note", "active-note"]);
  assert.deepEqual(listApexFamilyCareNotes(notes, { status: "" }).map((note) => note.id), ["archived-note", "review-note", "confirmed-note", "active-note"]);

  const reviewState = buildApexFamilyCareReviewState(notes, { status: "open", doctorOnly: true });

  assert.equal(reviewState.counts.total, 4);
  assert.equal(reviewState.counts.active, 1);
  assert.equal(reviewState.counts.confirmed, 1);
  assert.equal(reviewState.counts.needsReview, 1);
  assert.equal(reviewState.counts.archived, 1);
  assert.deepEqual(reviewState.notes.map((note) => note.id), ["review-note"]);
  assert.equal(reviewState.receipt.rawNoteTextStoredInReceipt, false);
  assert.equal(JSON.stringify(reviewState.receipt).includes("Knee note needs family review"), false);
  assert.equal(reviewState.receipt.cloudUsed, false);
  assert.equal(reviewState.receipt.smsSent, false);
  assert.equal(reviewState.receipt.medicalDiagnosis, false);
});

test("updating note status preserves archived/review notes in local storage", () => {
  const notes = [
    createApexFamilyCareNote({
      id: "note-to-archive",
      category: "pain",
      timestamp: "2026-06-09T13:00:00.000Z",
      summary: "Mistaken pain note.",
      addToDoctorSummary: true,
    }),
    createApexFamilyCareNote({
      id: "already-review",
      category: "meds",
      timestamp: "2026-06-09T12:00:00.000Z",
      summary: "Medication wording needs review.",
      status: "needs-review",
    }),
  ];

  const archived = updateApexFamilyCareNote(notes, "note-to-archive", { status: "archived" }, new Date("2026-06-09T15:00:00.000Z"));

  assert.equal(archived.changed, true);
  assert.equal(archived.updatedNote.status, "archived");
  assert.equal(archived.notes.length, 2);
  assert.deepEqual(listApexFamilyCareNotes(archived.notes).map((note) => note.id), []);
  assert.deepEqual(listApexFamilyCareNotes(archived.notes, { status: "" }).map((note) => note.id), ["note-to-archive", "already-review"]);

  const restored = updateApexFamilyCareNote(archived.notes, "already-review", { status: "active" }, new Date("2026-06-09T16:00:00.000Z"));

  assert.equal(restored.changed, true);
  assert.equal(restored.updatedNote.status, "active");
  assert.deepEqual(listApexFamilyCareNotes(restored.notes).map((note) => note.id), ["already-review"]);
});

test("revising care notes updates allowed fields and keeps revision receipts metadata-only", () => {
  const notes = [
    createApexFamilyCareNote({
      id: "note-to-revise",
      category: "pain",
      reporter: "Dad",
      timestamp: "2026-06-09T13:00:00.000Z",
      summary: "Knee hurt after lunch.",
      severity: "medium",
      bodyArea: "knee",
      addToDoctorSummary: true,
      familyVisible: true,
      urgent: true,
      status: "needs-review",
    }),
  ];

  const revised = reviseApexFamilyCareNote(notes, "note-to-revise", {
    category: "mobility",
    reporter: "Brother",
    timestamp: "2026-06-09T14:00:00.000Z",
    summary: "Needed extra time getting up after lunch.",
    severity: "mild",
    bodyArea: "legs",
    addToDoctorSummary: true,
    familyVisible: false,
    urgent: false,
    status: "confirmed",
    revisedBy: "Brother",
  }, new Date("2026-06-09T15:00:00.000Z"));

  assert.equal(revised.changed, true);
  assert.equal(revised.updatedNote.category, "mobility");
  assert.equal(revised.updatedNote.reporter, "Brother");
  assert.equal(revised.updatedNote.summary, "Needed extra time getting up after lunch.");
  assert.equal(revised.updatedNote.severity, "mild");
  assert.equal(revised.updatedNote.bodyArea, "legs");
  assert.equal(revised.updatedNote.familyVisible, false);
  assert.equal(revised.updatedNote.urgent, false);
  assert.equal(revised.updatedNote.status, "confirmed");
  assert.equal(revised.updatedNote.revisionCount, 1);
  assert.equal(revised.updatedNote.revisedAt, "2026-06-09T15:00:00.000Z");
  assert.equal(revised.updatedNote.revisedBy, "Brother");
  assert.equal(revised.updatedNote.reviewConfirmedAt, "2026-06-09T15:00:00.000Z");
  assert.equal(revised.updatedNote.reviewConfirmedBy, "Brother");
  assert.equal(revised.receipt.rawNoteTextStoredInReceipt, false);
  assert.equal(revised.receipt.metadata.changedFieldIds.includes("summary"), true);
  assert.equal(revised.receipt.metadata.confirmed, true);
  assert.equal(revised.receipt.metadata.rawNoteTextStoredInReceipt, false);
  assert.equal(JSON.stringify(revised.receipt).includes("Needed extra time"), false);
  assert.equal(revised.receipt.medicalDiagnosis, false);
  assert.equal(revised.receipt.emergencyReplacement, false);
  assert.equal(revised.receipt.cloudUsed, false);
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
  assert.equal(doctor.doctorPrepChecklist.some((item) => item.id === "review-flagged-notes"), true);
  assert.equal(doctor.doctorVisitSections.some((section) => section.id === "questions-to-ask"), true);
  assert.equal(doctor.doctorVisitSections.some((section) => section.id === "changes-since-last-visit"), true);
  assert.equal(doctor.doctorVisitSections.some((section) => section.id === "family-concerns"), true);
  assert.equal(doctor.doctorVisitBriefLines.some((line) => line.includes("Family notes only")), true);
  assert.equal(doctor.manualCopyOnly, true);
  assert.equal(doctor.noSends, true);
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

test("Family Care access readiness keeps Phase 1A local and approval-gated", () => {
  const readiness = buildApexFamilyCareAccessReadiness({
    standalone: true,
    routePrivate: true,
    accessMode: "local-only",
    installTarget: "house tablet",
    familyMembers: ["Dad", "Brother", "John", "Family"],
    generatedAt: "2026-06-09T12:00:00.000Z",
  });

  assert.equal(readiness.readinessType, "apex-family-care-access-readiness");
  assert.equal(readiness.localReady, true);
  assert.equal(readiness.remoteReady, false);
  assert.equal(readiness.policy.familyCareOnly, true);
  assert.equal(readiness.policy.apexHqProductWork, false);
  assert.equal(readiness.policy.apexHqNavigationRequired, false);
  assert.equal(readiness.policy.authSessionChanged, false);
  assert.equal(readiness.policy.schemaChanged, false);
  assert.equal(readiness.policy.cloudUsed, false);
  assert.equal(readiness.checks.some((check) => check.id === "remote-family-access" && check.status === "approval-required"), true);
  assert.equal(readiness.installSteps.some((step) => step.includes("add-to-home-screen")), true);
  assert.equal(readiness.receipt.metadata.approvedFamilyMemberCount, 4);
  assert.equal(readiness.receipt.metadata.rawFamilyDetailsStoredInReceipt, false);
  assert.equal(readiness.receipt.metadata.noSends, true);
  assert.equal(JSON.stringify(readiness.receipt).includes("Dad"), false);
  assert.equal(JSON.stringify(readiness.receipt).includes("Brother"), false);
});

test("Family Care boundary release prep keeps production blocked until approved", () => {
  const prep = buildApexFamilyCareBoundaryReleasePrep({
    generatedAt: "2026-06-09T18:00:00.000Z",
    standalone: true,
    hasHtmlEntry: true,
    hasManifest: true,
    hasStandaloneMount: true,
    apexHqNavigationFree: true,
    familyAccessModelApproved: false,
    privateReleaseApproved: false,
  });

  assert.equal(APEX_FAMILY_CARE_BOUNDARY_RELEASE_POLICY.apexHqProductWork, false);
  assert.equal(APEX_FAMILY_CARE_BOUNDARY_RELEASE_POLICY.productionReleaseApproved, false);
  assert.equal(APEX_FAMILY_CARE_BOUNDARY_RELEASE_POLICY.productionExposure, false);
  assert.equal(prep.readinessType, "apex-family-care-boundary-release-prep");
  assert.equal(prep.localPreviewReady, true);
  assert.equal(prep.productionBlocked, true);
  assert.equal(prep.privateReleaseApproved, false);
  assert.equal(prep.familyAccessModelApproved, false);
  assert.equal(prep.checks.every((check) => typeof check.label === "string" && typeof check.detail === "string"), true);
  assert.equal(prep.checks.find((check) => check.id === "production-release-gate").ready, true);
  assert.match(prep.nextApprovalNeeded, /Approve family access model/i);
  assert.equal(prep.receipt.receiptType, "apex-family-care-boundary-release-prep");
  assert.equal(prep.receipt.localOnly, true);
  assert.equal(prep.receipt.familyCareOnly, true);
  assert.equal(prep.receipt.apexHqProductWork, false);
  assert.equal(prep.receipt.productionExposure, false);
  assert.equal(prep.receipt.deployChanged, false);
  assert.equal(prep.receipt.hostingChanged, false);
  assert.equal(prep.receipt.authSessionChanged, false);
  assert.equal(prep.receipt.schemaChanged, false);
  assert.equal(prep.receipt.providerConfigured, false);
  assert.equal(prep.receipt.smsSent, false);
  assert.equal(prep.receipt.emailSent, false);
  assert.equal(prep.receipt.pushSent, false);
  assert.equal(prep.receipt.secretsStored, false);
  assert.equal(prep.receipt.rawAudioStored, false);
  assert.equal(prep.receipt.rawTranscriptStored, false);
  assert.equal(prep.receipt.medicalDiagnosis, false);
  assert.equal(prep.receipt.emergencyReplacement, false);
  assert.equal(prep.receipt.metadata.localPreviewReady, true);
  assert.equal(prep.receipt.metadata.productionBlocked, true);
  assert.equal(prep.receipt.metadata.privateReleaseApproved, false);
  assert.equal(prep.receipt.metadata.noSends, true);
});

test("Family Care local release smoke stays human-run and approval-gated", () => {
  const smoke = buildApexFamilyCareLocalReleaseSmokeChecklist({
    generatedAt: "2026-06-09T19:00:00.000Z",
    standalone: true,
    localPreviewReady: true,
    productionBlocked: true,
    directPwaReady: true,
    apexHqNavigationFree: true,
    houseDeviceTarget: "house tablet",
    familyAccessModelApproved: false,
    accessModel: "not-chosen",
  });

  assert.equal(APEX_FAMILY_CARE_LOCAL_RELEASE_SMOKE_POLICY.apexHqProductWork, false);
  assert.equal(APEX_FAMILY_CARE_LOCAL_RELEASE_SMOKE_POLICY.humanRunOnly, true);
  assert.equal(APEX_FAMILY_CARE_LOCAL_RELEASE_SMOKE_POLICY.localPreviewOnly, true);
  assert.equal(APEX_FAMILY_CARE_LOCAL_RELEASE_SMOKE_POLICY.familyAccessModelRequired, true);
  assert.equal(smoke.checklistType, "apex-family-care-local-release-smoke");
  assert.equal(smoke.readyToRunLocalSmoke, true);
  assert.equal(smoke.familyAccessModelApproved, false);
  assert.equal(smoke.productionBlocked, true);
  assert.equal(smoke.noImplementationChanges, true);
  assert.equal(smoke.smokeSteps.some((step) => step.id === "choose-access-model" && step.status === "decision-needed"), true);
  assert.equal(smoke.localRunInstructions.some((step) => step.includes("Stop before remote access")), true);
  assert.match(smoke.nextApprovalNeeded, /Choose the family access model/i);
  assert.equal(smoke.receipt.receiptType, "apex-family-care-local-release-smoke");
  assert.equal(smoke.receipt.localOnly, true);
  assert.equal(smoke.receipt.familyCareOnly, true);
  assert.equal(smoke.receipt.apexHqProductWork, false);
  assert.equal(smoke.receipt.humanRunOnly, true);
  assert.equal(smoke.receipt.productionExposure, false);
  assert.equal(smoke.receipt.remoteAccessApproved, false);
  assert.equal(smoke.receipt.authSessionChanged, false);
  assert.equal(smoke.receipt.schemaChanged, false);
  assert.equal(smoke.receipt.deployChanged, false);
  assert.equal(smoke.receipt.hostingChanged, false);
  assert.equal(smoke.receipt.providerConfigured, false);
  assert.equal(smoke.receipt.smsSent, false);
  assert.equal(smoke.receipt.emailSent, false);
  assert.equal(smoke.receipt.pushSent, false);
  assert.equal(smoke.receipt.cloudUsed, false);
  assert.equal(smoke.receipt.secretsStored, false);
  assert.equal(smoke.receipt.rawAudioStored, false);
  assert.equal(smoke.receipt.rawTranscriptStored, false);
  assert.equal(smoke.receipt.medicalDiagnosis, false);
  assert.equal(smoke.receipt.emergencyReplacement, false);
  assert.equal(smoke.receipt.metadata.rawFamilyDetailsStoredInReceipt, false);
  assert.equal(smoke.receipt.metadata.noImplementationChanges, true);
  assert.equal(smoke.receipt.metadata.noSends, true);
  assert.equal(JSON.stringify(smoke.receipt).includes("house tablet"), false);
});
