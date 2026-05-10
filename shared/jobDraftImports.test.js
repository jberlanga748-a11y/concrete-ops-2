import assert from "node:assert/strict";
import test from "node:test";

import {
  CITY_STATE_WARNING,
  createImportedJobDraftFromPackage,
  filterImportedJobDrafts,
  findDuplicateImportedJobDraft,
  formatImportedDraftJobNotes,
  getImportedDraftWarnings,
  isImportedDraftReadyForJob,
  mapImportedDraftToJobPayload,
  normalizeImportedJobDraft,
  normalizeImportedJobDrafts,
  stripSensitiveFields,
  upsertImportedJobDraft,
  validateJobDraftImportPackage,
} from "./jobDraftImports.js";

const validPackage = {
  packageVersion: "1.0",
  exportedAt: "2026-05-10T12:00:00.000Z",
  sourceApp: "Last Yard Concrete Proposal / GC Packet Generator",
  packageType: "concrete_ops_job_draft",
  opsJobDraftId: "ops-draft-1",
  sourceHandoffId: "handoff-1",
  sourceLeadId: "lead-1",
  sourceProposalId: "proposal-1",
  customerName: "ABC Apartments",
  contactName: "Alex GC",
  contactEmail: "alex@example.com",
  contactPhone: "555-0100",
  jobName: "Albany Sidewalk Repair",
  jobAddress: "123 Main St, Albany, OR 97321",
  city: "Albany",
  state: "OR",
  serviceType: "Sidewalk",
  projectType: "Replacement",
  scopeSummary: "Replace damaged sidewalk panels.",
  includedScope: ["Demo damaged panels", "Place broom finish concrete"],
  exclusions: ["Traffic control by GC"],
  assumptions: ["Normal working hours"],
  operationsNotes: "Coordinate access.",
  crewNotes: "Two-person crew.",
  scheduleNotes: "Coordinate after demo.",
  startDateTarget: "2026-05-20",
  assignedCrewPlaceholder: "Concrete crew",
  foremanPlaceholder: "TBD",
  draftStatus: "Ready to Create in Concrete Ops",
  opsReadinessScore: 92,
  opsReadinessLabel: "Ready",
  opsReadinessIssues: [],
  proposalAmount: 18500,
  proposalLinkOrId: "proposal-1",
  handoffStatus: "Ready for Ops Review",
  jobDraftSummary: "Concrete Ops Job Draft: Albany Sidewalk Repair",
};

test("valid job draft package imports as ready when city/state are present", () => {
  const result = createImportedJobDraftFromPackage(validPackage, { id: "import-1", importedAt: "2026-05-11T00:00:00.000Z" });

  assert.equal(result.ok, true);
  assert.equal(result.draft.id, "import-1");
  assert.equal(result.draft.packageType, "concrete_ops_job_draft");
  assert.equal(result.draft.importStatus, "Ready to Create Job");
  assert.equal(result.draft.customerName, "ABC Apartments");
  assert.equal(result.draft.city, "Albany");
  assert.equal(result.draft.state, "OR");
  assert.deepEqual(result.draft.includedScope, ["Demo damaged panels", "Place broom finish concrete"]);
});

test("missing city/state with jobAddress imports as Needs Review and warns", () => {
  const result = createImportedJobDraftFromPackage({
    ...validPackage,
    jobAddress: "123 Rural Route",
    city: "",
    state: "",
  }, { id: "import-2" });

  assert.equal(result.ok, true);
  assert.equal(result.draft.importStatus, "Needs Review");
  assert.equal(result.draft.city, "");
  assert.equal(result.draft.state, "");
  assert.ok(result.warnings.includes(CITY_STATE_WARNING));
  assert.ok(getImportedDraftWarnings(result.draft).includes(CITY_STATE_WARNING));
});

test("city/state derive from a parseable jobAddress", () => {
  const result = createImportedJobDraftFromPackage({
    ...validPackage,
    jobAddress: "456 Water Ave, Corvallis, OR 97330",
    city: "",
    state: "",
  }, { id: "import-3" });

  assert.equal(result.ok, true);
  assert.equal(result.draft.city, "Corvallis");
  assert.equal(result.draft.state, "OR");
  assert.equal(result.draft.importStatus, "Ready to Create Job");
});

test("invalid package type and missing required fields are rejected clearly", () => {
  const invalidType = validateJobDraftImportPackage({ ...validPackage, packageType: "proposal_backup" });
  const missing = validateJobDraftImportPackage({ ...validPackage, customerName: "", jobAddress: "", city: "" });

  assert.equal(invalidType.ok, false);
  assert.match(invalidType.errors.join(" "), /Unsupported packageType/);
  assert.equal(missing.ok, false);
  assert.ok(missing.missingFields.includes("customerName"));
  assert.ok(missing.missingFields.includes("city"));
});

test("sensitive-looking imported fields are stripped and ignored", () => {
  const result = createImportedJobDraftFromPackage({
    ...validPackage,
    apiKey: "secret",
    session: { accessToken: "secret-session" },
    nested: { refreshToken: "secret-refresh", safeValue: "keep me" },
  });

  assert.equal(result.ok, true);
  assert.doesNotMatch(JSON.stringify(result.draft.originalPackage), /secret|apiKey|accessToken|refreshToken|session/);
  assert.equal(result.draft.originalPackage.nested.safeValue, "keep me");
  assert.deepEqual(stripSensitiveFields({ password: "secret", contactName: "Alex" }), { contactName: "Alex" });
});

test("duplicate import detection works by ids and composite customer job city", () => {
  const first = createImportedJobDraftFromPackage(validPackage, { id: "import-1" }).draft;
  const sameOpsId = createImportedJobDraftFromPackage({ ...validPackage, sourceHandoffId: "handoff-2", jobName: "Different" }, { id: "import-2" }).draft;
  const sameHandoffId = createImportedJobDraftFromPackage({ ...validPackage, opsJobDraftId: "ops-draft-2" }, { id: "import-3" }).draft;
  const sameComposite = createImportedJobDraftFromPackage({ ...validPackage, opsJobDraftId: "ops-draft-3", sourceHandoffId: "handoff-3" }, { id: "import-4" }).draft;

  assert.equal(findDuplicateImportedJobDraft([first], sameOpsId)?.id, "import-1");
  assert.equal(findDuplicateImportedJobDraft([first], sameHandoffId)?.id, "import-1");
  assert.equal(findDuplicateImportedJobDraft([first], sameComposite)?.id, "import-1");
});

test("imported draft edits normalize, persist, and filter safely", () => {
  const original = createImportedJobDraftFromPackage(validPackage, { id: "import-1" }).draft;
  const edited = normalizeImportedJobDraft({
    ...original,
    city: "Salem",
    importStatus: "Needs Review",
    updatedAt: "2026-05-12T00:00:00.000Z",
  });
  const collection = upsertImportedJobDraft([original], edited);
  const filtered = filterImportedJobDrafts(collection, { statusFilter: "Needs Review", cityFilter: "salem", createdFilter: "Not Created" });

  assert.equal(collection.length, 1);
  assert.equal(collection[0].city, "Salem");
  assert.equal(filtered.length, 1);
  assert.equal(normalizeImportedJobDrafts(collection)[0].importStatus, "Needs Review");
});

test("job creation mapping requires city/state unless override is explicit", () => {
  const needsReview = createImportedJobDraftFromPackage({
    ...validPackage,
    jobAddress: "123 Rural Route",
    city: "",
    state: "",
  }, { id: "import-1" }).draft;

  assert.equal(isImportedDraftReadyForJob(needsReview), false);
  assert.throws(() => mapImportedDraftToJobPayload(needsReview), /City\/state missing/);
  assert.doesNotThrow(() => mapImportedDraftToJobPayload(needsReview, { allowMissingCityState: true }));
});

test("Concrete Ops 2 job mapping uses existing job storage shape", () => {
  const draft = createImportedJobDraftFromPackage(validPackage, { id: "import-1" }).draft;
  const jobPayload = mapImportedDraftToJobPayload(draft);
  const notes = formatImportedDraftJobNotes(draft);

  assert.equal(jobPayload.title, "Albany Sidewalk Repair");
  assert.equal(jobPayload.job, "Albany Sidewalk Repair");
  assert.equal(jobPayload.customer, "ABC Apartments");
  assert.equal(jobPayload.crew, "Concrete crew");
  assert.equal(jobPayload.status, "scheduled");
  assert.equal(jobPayload.scheduledStart, "2026-05-20T08:00");
  assert.equal(jobPayload.progress, 0);
  assert.match(jobPayload.notes, /Source Proposal ID: proposal-1/);
  assert.match(notes, /Readiness/);
});
