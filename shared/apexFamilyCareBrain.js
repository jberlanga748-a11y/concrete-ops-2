import {
  APEX_FAMILY_CARE_MAX_LOCAL_NOTES,
  APEX_FAMILY_CARE_SUBJECT,
  addApexFamilyCareNote,
  buildApexFamilyCareDoctorSummary,
  buildApexFamilyCareFamilySummary,
  buildApexFamilyCareReviewState,
  buildApexFamilyCareTodaySummary,
  createApexFamilyCareNote,
  listApexFamilyCareNotes,
  updateApexFamilyCareNote,
} from "./apexFamilyCare.js";

export const APEX_FAMILY_CARE_BRAIN_ACTIONS = [
  "logCareNote",
  "getTodayCareStatus",
  "buildDoctorSummary",
  "buildFamilyDigest",
  "listOpenConcerns",
  "buildCareCoordinatorPacket",
  "markMedicationConfirmed",
];

export const APEX_FAMILY_CARE_RECEIPT_PRIVACY = Object.freeze({
  localOnly: true,
  operatorOnly: true,
  familyCareOnly: true,
  apexHqProductWork: false,
  cloudUsed: false,
  rawPromptStored: false,
  rawResponseStored: false,
  rawAudioStored: false,
  rawTranscriptStored: false,
  secretsStored: false,
  customerDataStored: false,
  medicalDiagnosis: false,
  emergencyReplacement: false,
});

export const APEX_FAMILY_CARE_COORDINATOR_POLICY = Object.freeze({
  policyId: "apex-family-care-coordinator-v1",
  phase: "phase-3a-apex-care-coordinator-loop",
  localOnly: true,
  familyCareOnly: true,
  apexHqProductWork: false,
  humanReviewRequired: true,
  autoSend: false,
  smsSent: false,
  emailSent: false,
  pushSent: false,
  cloudUsed: false,
  medicationConfirmationOnly: true,
  medicationControl: false,
  dosingAdvice: false,
  treatmentInstructions: false,
  rawPromptStored: false,
  rawResponseStored: false,
  rawAudioStored: false,
  rawTranscriptStored: false,
  rawNoteTextStoredInReceipt: false,
  medicalDiagnosis: false,
  emergencyReplacement: false,
});

const MAX_RECEIPTS = 80;
const OPEN_CONCERN_CATEGORIES = new Set(["concern", "pain", "mobility"]);
const SAFE_METADATA_KEYS = new Set([
  "action",
  "outcome",
  "noteId",
  "category",
  "severity",
  "reporter",
  "familyVisible",
  "addToDoctorSummary",
  "urgent",
  "noteCount",
  "todayCount",
  "openConcernCount",
  "doctorItemCount",
  "visibleCount",
  "concernCount",
  "careLoopStatus",
  "missingUpdateStatus",
  "hasRepeatedConcerns",
  "coordinatorPromptCount",
  "dailyReviewItemCount",
  "openConcernPromptCount",
  "doctorPrepPromptCount",
  "medicationReviewCount",
  "needsReviewCount",
  "humanReviewRequired",
  "autoSend",
  "medicationConfirmationOnly",
  "medicationControl",
  "changed",
  "found",
  "limit",
]);

function cleanText(value, maxLength = 96) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function normalizeNow(value, fallback = new Date()) {
  const resolved = typeof value === "function" ? value() : value;
  const date = resolved instanceof Date ? resolved : new Date(resolved || fallback);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function mergeTags(...groups) {
  return Array.from(new Set(groups.flat().map((tag) => cleanText(tag, 48)).filter(Boolean))).slice(0, 8);
}

function safeMetadata(metadata = {}) {
  const output = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (!SAFE_METADATA_KEYS.has(key)) continue;
    if (typeof value === "boolean" || typeof value === "number") {
      output[key] = value;
    } else if (typeof value === "string") {
      output[key] = cleanText(value, 96);
    }
  }
  return output;
}

function createReceipt(action, generatedAt, metadata = {}) {
  return {
    receiptType: "apex-family-care-brain",
    schemaVersion: 1,
    action,
    generatedAt: generatedAt.toISOString(),
    subject: APEX_FAMILY_CARE_SUBJECT,
    ...APEX_FAMILY_CARE_RECEIPT_PRIVACY,
    metadata: safeMetadata({
      action,
      outcome: "ok",
      ...metadata,
    }),
  };
}

function isOpenConcern(note) {
  if (note.status !== "active") return false;
  if (note.urgent || note.severity === "severe" || note.category === "concern") return true;
  return OPEN_CONCERN_CATEGORIES.has(note.category) && note.severity !== "unknown";
}

export function getApexFamilyCareBrainInterfaceSummary() {
  return {
    interfaceId: "apex-family-care-brain",
    status: "ready",
    actions: APEX_FAMILY_CARE_BRAIN_ACTIONS,
    ...APEX_FAMILY_CARE_RECEIPT_PRIVACY,
    coordinatorPolicyId: APEX_FAMILY_CARE_COORDINATOR_POLICY.policyId,
    humanReviewRequired: true,
    autoSend: false,
    medicationConfirmationOnly: true,
    medicationControl: false,
  };
}

function buildPrompt(id, label, detail, priority = "normal", options = {}) {
  return {
    id,
    label,
    detail,
    priority,
    humanReviewRequired: true,
    autoSend: false,
    medicationControl: false,
    category: cleanText(options.category, 48) || "care",
    noteId: cleanText(options.noteId, 96),
  };
}

function doctorPrepMissingDetails(note) {
  const missing = [];
  if (note.severity === "unknown" && ["pain", "concern", "mobility", "sleep", "mood"].includes(note.category)) {
    missing.push("severity");
  }
  if (!note.bodyArea && ["pain", "mobility"].includes(note.category)) {
    missing.push("body area");
  }
  if (note.category === "meds" && !note.medicationConfirmed) {
    missing.push("confirmation status");
  }
  return missing;
}

export function buildApexFamilyCareCoordinatorPacket(notes = [], options = {}) {
  const now = normalizeNow(options.now, new Date());
  const allNotes = listApexFamilyCareNotes(notes, { limit: Number.POSITIVE_INFINITY, status: "" });
  const activeNotes = listApexFamilyCareNotes(allNotes, { limit: Number.POSITIVE_INFINITY });
  const todayStatus = buildApexFamilyCareTodaySummary(activeNotes, now);
  const doctorSummary = buildApexFamilyCareDoctorSummary(allNotes, now);
  const familyDigest = buildApexFamilyCareFamilySummary(activeNotes, now);
  const reviewState = buildApexFamilyCareReviewState(allNotes, { status: "open" });
  const openConcerns = activeNotes.filter(isOpenConcern).slice(0, 5);
  const doctorPrepNotes = activeNotes.filter((note) => note.addToDoctorSummary).slice(0, 12);
  const medicationReviewNotes = doctorPrepNotes.filter((note) => note.category === "meds" && !note.medicationConfirmed);

  const dailyReviewItems = [
    {
      id: "care-loop-status",
      label: "Care loop status",
      status: todayStatus.careLoopStatus,
      detail: todayStatus.missingUpdate.message,
      needsHumanCheck: Boolean(todayStatus.missingUpdate.missing),
    },
    {
      id: "family-digest-status",
      label: "Family digest status",
      status: familyDigest.headline,
      detail: familyDigest.lockScreenSafeNotification,
      needsHumanCheck: familyDigest.concernCount > 0,
    },
    {
      id: "doctor-prep-status",
      label: "Doctor prep status",
      status: `${doctorSummary.itemCount} saved notes`,
      detail: `${doctorSummary.reviewState?.counts?.needsReview || 0} doctor-prep notes need review.`,
      needsHumanCheck: (doctorSummary.reviewState?.counts?.needsReview || 0) > 0,
    },
  ];

  const openConcernPrompts = openConcerns.map((note) => buildPrompt(
    `open-concern-${note.id}`,
    `Check ${note.categoryLabel.toLowerCase()} concern`,
    "Ask a family member whether this concern is still open, improving, or should be saved for the next appointment.",
    note.severity === "severe" || note.urgent ? "high" : "normal",
    { category: note.category, noteId: note.id },
  ));

  const doctorPrepPrompts = doctorPrepNotes.flatMap((note) => {
    const missing = doctorPrepMissingDetails(note);
    if (!missing.length) return [];
    return [buildPrompt(
      `doctor-detail-${note.id}`,
      `Add ${missing.join(" and ")} before doctor prep`,
      "Ask one short follow-up and let a human review the note before relying on it for the doctor visit.",
      "normal",
      { category: note.category, noteId: note.id },
    )];
  });

  const medicationReviewPrompts = medicationReviewNotes.map((note) => buildPrompt(
    `medication-review-${note.id}`,
    "Confirm medication note only",
    "Confirm whether this was a medication note or a family-confirmed medication event. Do not suggest dose, schedule, or treatment changes.",
    "normal",
    { category: note.category, noteId: note.id },
  ));

  const reviewPrompts = reviewState.counts.needsReview
    ? [buildPrompt(
      "review-flagged-notes",
      "Review flagged care notes",
      "Resolve notes marked needs-review before using them in family summaries or doctor prep.",
      "high",
      { category: "review" },
    )]
    : [];

  const prompts = [
    ...reviewPrompts,
    ...openConcernPrompts,
    ...doctorPrepPrompts,
    ...medicationReviewPrompts,
  ];

  return {
    packetType: "apex-family-care-coordinator-packet",
    generatedAt: now.toISOString(),
    subject: APEX_FAMILY_CARE_SUBJECT,
    policy: APEX_FAMILY_CARE_COORDINATOR_POLICY,
    dailyReviewItems,
    openConcernPrompts,
    doctorPrepPrompts,
    medicationReviewPrompts,
    reviewPrompts,
    prompts,
    summary: {
      noteCount: activeNotes.length,
      todayCount: todayStatus.todayCount,
      openConcernCount: openConcernPrompts.length,
      doctorPrepPromptCount: doctorPrepPrompts.length,
      medicationReviewCount: medicationReviewPrompts.length,
      needsReviewCount: reviewState.counts.needsReview,
      missingUpdateStatus: todayStatus.missingUpdate.status,
      hasRepeatedConcerns: todayStatus.repeatedConcernPatterns.hasRepeatedConcerns,
      nextHumanAction: prompts.length
        ? prompts[0].detail
        : "No coordinator prompts need action right now.",
    },
    receipt: {
      receiptType: "apex-family-care-coordinator-packet",
      schemaVersion: 1,
      generatedAt: now.toISOString(),
      subject: APEX_FAMILY_CARE_SUBJECT,
      ...APEX_FAMILY_CARE_RECEIPT_PRIVACY,
      ...APEX_FAMILY_CARE_COORDINATOR_POLICY,
      metadata: safeMetadata({
        action: "buildCareCoordinatorPacket",
        outcome: "ok",
        noteCount: activeNotes.length,
        todayCount: todayStatus.todayCount,
        openConcernPromptCount: openConcernPrompts.length,
        doctorPrepPromptCount: doctorPrepPrompts.length,
        medicationReviewCount: medicationReviewPrompts.length,
        needsReviewCount: reviewState.counts.needsReview,
        coordinatorPromptCount: prompts.length,
        dailyReviewItemCount: dailyReviewItems.length,
        missingUpdateStatus: todayStatus.missingUpdate.status,
        hasRepeatedConcerns: todayStatus.repeatedConcernPatterns.hasRepeatedConcerns,
        humanReviewRequired: true,
        autoSend: false,
        medicationConfirmationOnly: true,
        medicationControl: false,
      }),
    },
  };
}

export function createApexFamilyCareBrain(initialNotes = [], options = {}) {
  const maxNotes = options.maxNotes || APEX_FAMILY_CARE_MAX_LOCAL_NOTES;
  let notes = listApexFamilyCareNotes(initialNotes, { limit: maxNotes, status: "" });
  let receipts = [];

  function readNow(actionOptions = {}) {
    return normalizeNow(actionOptions.now ?? options.now, new Date());
  }

  function pushReceipt(action, now, metadata = {}) {
    const receipt = createReceipt(action, now, metadata);
    receipts = [receipt, ...receipts].slice(0, MAX_RECEIPTS);
    return receipt;
  }

  function getNotes(actionOptions = {}) {
    return listApexFamilyCareNotes(notes, {
      limit: actionOptions.limit || maxNotes,
      status: actionOptions.status ?? "active",
    });
  }

  function logCareNote(input = {}, actionOptions = {}) {
    const now = readNow(actionOptions);
    const note = createApexFamilyCareNote({
      ...input,
      source: "apex",
    }, now);
    notes = addApexFamilyCareNote(notes, note, now, { maxNotes });

    const receipt = pushReceipt("logCareNote", now, {
      noteId: note.id,
      category: note.category,
      severity: note.severity,
      reporter: note.reporter,
      familyVisible: note.familyVisible,
      addToDoctorSummary: note.addToDoctorSummary,
      urgent: note.urgent,
      noteCount: notes.length,
    });

    return { note, notes: getNotes(), receipt };
  }

  function getTodayCareStatus(actionOptions = {}) {
    const now = readNow(actionOptions);
    const todayStatus = buildApexFamilyCareTodaySummary(notes, now);
    const receipt = pushReceipt("getTodayCareStatus", now, {
      noteCount: todayStatus.noteCount,
      todayCount: todayStatus.todayCount,
      openConcernCount: todayStatus.openConcernCount,
      doctorItemCount: todayStatus.doctorItemCount,
      careLoopStatus: todayStatus.careLoopStatus,
      missingUpdateStatus: todayStatus.missingUpdate?.status,
      hasRepeatedConcerns: todayStatus.repeatedConcernPatterns?.hasRepeatedConcerns,
    });
    return { todayStatus, receipt };
  }

  function buildDoctorSummary(actionOptions = {}) {
    const now = readNow(actionOptions);
    const doctorSummary = buildApexFamilyCareDoctorSummary(notes, now);
    const receipt = pushReceipt("buildDoctorSummary", now, {
      noteCount: notes.length,
      doctorItemCount: doctorSummary.itemCount,
      concernCount: doctorSummary.concernCount,
      missingUpdateStatus: doctorSummary.missingUpdate?.status,
      hasRepeatedConcerns: doctorSummary.patternSummary?.hasRepeatedConcerns,
    });
    return { doctorSummary, receipt };
  }

  function buildFamilyDigest(actionOptions = {}) {
    const now = readNow(actionOptions);
    const familyDigest = buildApexFamilyCareFamilySummary(notes, now);
    const receipt = pushReceipt("buildFamilyDigest", now, {
      noteCount: notes.length,
      visibleCount: familyDigest.visibleCount,
      concernCount: familyDigest.concernCount,
      missingUpdateStatus: familyDigest.missingUpdate?.status,
      hasRepeatedConcerns: familyDigest.patternSummary?.hasRepeatedConcerns,
    });
    return { familyDigest, receipt };
  }

  function listOpenConcerns(actionOptions = {}) {
    const now = readNow(actionOptions);
    const limit = actionOptions.limit || 12;
    const concerns = getNotes({ limit: Number.POSITIVE_INFINITY }).filter(isOpenConcern).slice(0, limit);
    const receipt = pushReceipt("listOpenConcerns", now, {
      noteCount: notes.length,
      openConcernCount: concerns.length,
      limit,
    });
    return { concerns, receipt };
  }

  function buildCareCoordinatorPacket(actionOptions = {}) {
    const now = readNow(actionOptions);
    const coordinatorPacket = buildApexFamilyCareCoordinatorPacket(notes, { now });
    const receipt = pushReceipt("buildCareCoordinatorPacket", now, {
      noteCount: coordinatorPacket.summary.noteCount,
      todayCount: coordinatorPacket.summary.todayCount,
      openConcernPromptCount: coordinatorPacket.summary.openConcernCount,
      doctorPrepPromptCount: coordinatorPacket.summary.doctorPrepPromptCount,
      medicationReviewCount: coordinatorPacket.summary.medicationReviewCount,
      needsReviewCount: coordinatorPacket.summary.needsReviewCount,
      coordinatorPromptCount: coordinatorPacket.prompts.length,
      dailyReviewItemCount: coordinatorPacket.dailyReviewItems.length,
      missingUpdateStatus: coordinatorPacket.summary.missingUpdateStatus,
      hasRepeatedConcerns: coordinatorPacket.summary.hasRepeatedConcerns,
      humanReviewRequired: true,
      autoSend: false,
      medicationConfirmationOnly: true,
      medicationControl: false,
    });
    return { coordinatorPacket, receipt };
  }

  function markMedicationConfirmed(input = {}, actionOptions = {}) {
    const now = readNow(actionOptions);
    const confirmedBy = cleanText(input.confirmedBy || input.reporter || "Family", 80) || "Family";
    const confirmedAt = cleanText(input.confirmedAt, 40) || now.toISOString();
    const medicationTag = cleanText(input.medicationTag || input.medicationName, 48);
    const confirmationTags = mergeTags(["medication-confirmed"], medicationTag ? [medicationTag] : []);
    const noteId = cleanText(input.noteId, 96);

    if (noteId) {
      const existing = getNotes({ limit: Number.POSITIVE_INFINITY }).find((note) => note.id === noteId);
      if (!existing) {
        const receipt = pushReceipt("markMedicationConfirmed", now, {
          outcome: "not-found",
          noteId,
          found: false,
          changed: false,
          medicationConfirmationOnly: true,
          medicationControl: false,
        });
        return {
          changed: false,
          note: null,
          notes: getNotes(),
          medicationConfirmationOnly: true,
          medicationControl: false,
          receipt,
        };
      }

      const updated = updateApexFamilyCareNote(notes, noteId, {
        addToDoctorSummary: true,
        medicationConfirmed: true,
        medicationConfirmedAt: confirmedAt,
        medicationConfirmedBy: confirmedBy,
        medicationConfirmationOnly: true,
        source: "apex",
        tags: mergeTags(existing.tags, confirmationTags),
      }, now, { maxNotes });

      notes = updated.notes;
      const receipt = pushReceipt("markMedicationConfirmed", now, {
        outcome: updated.changed ? "updated" : "not-found",
        noteId,
        category: updated.updatedNote?.category || existing.category,
        changed: updated.changed,
        found: true,
        medicationConfirmationOnly: true,
        medicationControl: false,
      });

      return {
        changed: updated.changed,
        note: updated.updatedNote,
        notes: getNotes(),
        medicationConfirmationOnly: true,
        medicationControl: false,
        receipt,
      };
    }

    const summary = `Medication was confirmed by ${confirmedBy}.`;
    const note = createApexFamilyCareNote({
      category: "meds",
      reporter: confirmedBy,
      timestamp: confirmedAt,
      summary,
      tags: confirmationTags,
      addToDoctorSummary: true,
      familyVisible: input.familyVisible !== false,
      medicationConfirmed: true,
      medicationConfirmedAt: confirmedAt,
      medicationConfirmedBy: confirmedBy,
      medicationConfirmationOnly: true,
      source: "apex",
    }, now);

    notes = addApexFamilyCareNote(notes, note, now, { maxNotes });
    const receipt = pushReceipt("markMedicationConfirmed", now, {
      outcome: "created",
      noteId: note.id,
      category: note.category,
      changed: true,
      found: true,
      familyVisible: note.familyVisible,
      addToDoctorSummary: note.addToDoctorSummary,
      medicationConfirmationOnly: true,
      medicationControl: false,
    });

    return {
      changed: true,
      note,
      notes: getNotes(),
      medicationConfirmationOnly: true,
      medicationControl: false,
      receipt,
    };
  }

  function getReceipts(actionOptions = {}) {
    const limit = actionOptions.limit || MAX_RECEIPTS;
    return receipts.slice(0, limit);
  }

  return {
    interface: getApexFamilyCareBrainInterfaceSummary(),
    logCareNote,
    getTodayCareStatus,
    buildDoctorSummary,
    buildFamilyDigest,
    listOpenConcerns,
    buildCareCoordinatorPacket,
    markMedicationConfirmed,
    getNotes,
    getReceipts,
  };
}
