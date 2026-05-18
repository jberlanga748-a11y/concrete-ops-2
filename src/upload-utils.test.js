import assert from "node:assert/strict";
import test from "node:test";

import {
  buildUploadSupportContext,
  deriveAllowedUploadJobs,
  deriveSelectedPhotoTakenAt,
  deriveUploadDraftFromSelection,
  deriveUploadListState,
  findSelectedUpload,
  filterUploads,
  gpsStatusLabel,
  uploadCustomerLabel,
  uploadJobLabel,
  uploadTitle,
  uploadUploaderLabel,
  validateUploadFile,
} from "./upload-utils.js";

test("deriveAllowedUploadJobs excludes archived jobs", () => {
  const jobs = deriveAllowedUploadJobs([
    { id: "J-1", title: "Active job" },
    { id: "J-2", title: "Archived job", archivedAt: "2026-04-25T12:00:00.000Z" },
  ]);

  assert.deepEqual(jobs.map((job) => job.id), ["J-1"]);
});

test("gpsStatusLabel handles captured, denied, unavailable, and not requested", () => {
  assert.equal(gpsStatusLabel({ latitude: 44.9, longitude: -123.0 }), "Location captured");
  assert.equal(gpsStatusLabel({ locationUnavailableReason: "Location permission denied by user." }), "Location denied");
  assert.equal(gpsStatusLabel({ locationUnavailableReason: "Location unavailable indoors." }), "Location unavailable");
  assert.equal(gpsStatusLabel({}), "Not requested");
});

test("deriveSelectedPhotoTakenAt uses the selection time when no EXIF time is available", () => {
  assert.equal(
    deriveSelectedPhotoTakenAt(new Date("2026-04-25T18:45:00.000Z")),
    "2026-04-25T18:45:00.000Z",
  );
});

test("deriveUploadDraftFromSelection preserves draft state and sets file metadata plus takenAt", () => {
  const nextDraft = deriveUploadDraftFromSelection(
    {
      jobId: "J-100",
      caption: "Before pour",
      notes: "North edge formwork",
      latitude: 44.94,
      longitude: -123.03,
    },
    {
      name: "pour-photo.jpg",
      type: "image/jpeg",
      size: 2048,
    },
    "data:image/jpeg;base64,abc123",
    "2026-04-25T19:15:00.000Z",
  );

  assert.equal(nextDraft.jobId, "J-100");
  assert.equal(nextDraft.caption, "Before pour");
  assert.equal(nextDraft.notes, "North edge formwork");
  assert.equal(nextDraft.latitude, 44.94);
  assert.equal(nextDraft.longitude, -123.03);
  assert.equal(nextDraft.fileName, "pour-photo.jpg");
  assert.equal(nextDraft.fileType, "image/jpeg");
  assert.equal(nextDraft.fileSize, 2048);
  assert.equal(nextDraft.dataUrl, "data:image/jpeg;base64,abc123");
  assert.equal(nextDraft.takenAtIso, "2026-04-25T19:15:00.000Z");
});

test("validateUploadFile enforces image types and size", () => {
  assert.equal(validateUploadFile(null), "Choose a photo to upload.");
  assert.equal(validateUploadFile({ type: "application/javascript", size: 100 }), "Only image uploads are supported right now.");
  assert.match(validateUploadFile({ type: "image/png", size: 9 * 1024 * 1024 }), /8MB or smaller/);
  assert.equal(validateUploadFile({ type: "image/png", size: 1024 }), "");
});

test("filterUploads supports gps, archived, job, uploader, and query filters", () => {
  const uploads = [
    {
      id: "UPL-1",
      jobId: "J-1",
      uploadedBy: "U-1",
      uploadedByName: "Ava",
      uploadedAt: "2026-04-25T10:00:00.000Z",
      caption: "Forms ready",
      job: { title: "Driveway", customer: "Carter" },
      latitude: 44.9,
      longitude: -123.0,
    },
    {
      id: "UPL-2",
      jobId: "J-2",
      uploadedBy: "U-2",
      uploadedByName: "Ben",
      uploadedAt: "2026-04-24T10:00:00.000Z",
      caption: "No location",
      job: { title: "Patio", customer: "Nguyen" },
      locationUnavailableReason: "Location denied.",
      archivedAt: "2026-04-25T11:00:00.000Z",
    },
  ];

  assert.deepEqual(filterUploads(uploads, { gps: "Has GPS" }).map((upload) => upload.id), ["UPL-1"]);
  assert.deepEqual(filterUploads(uploads, { gps: "Missing GPS", archived: "All uploads" }).map((upload) => upload.id), ["UPL-2"]);
  assert.deepEqual(filterUploads(uploads, { archived: "Archived only" }).map((upload) => upload.id), ["UPL-2"]);
  assert.deepEqual(filterUploads(uploads, { jobId: "J-1", uploaderId: "U-1", query: "carter" }).map((upload) => upload.id), ["UPL-1"]);
});

test("deriveUploadListState tolerates empty inputs and derives options", () => {
  assert.deepEqual(deriveUploadListState(undefined), {
    jobOptions: [],
    uploaderOptions: [],
    dateOptions: [],
  });

  const state = deriveUploadListState([
    {
      id: "UPL-1",
      jobId: "J-1",
      uploadedBy: "U-1",
      uploadedByName: "Ava",
      uploadedAt: "2026-04-25T10:00:00.000Z",
      job: { title: "Driveway" },
    },
  ]);

  assert.deepEqual(state.jobOptions, [{ value: "J-1", label: "Driveway" }]);
  assert.deepEqual(state.uploaderOptions, [{ value: "U-1", label: "Ava" }]);
  assert.deepEqual(state.dateOptions, ["2026-04-25"]);
});

test("upload display helpers tolerate missing gps and sparse uploader or job records", () => {
  const upload = {
    id: "UPL-2",
    fileName: "field-shot.jpg",
    uploadedBy: "U-9",
    locationUnavailableReason: "",
  };

  assert.equal(uploadTitle(upload), "field-shot.jpg");
  assert.equal(uploadJobLabel(upload), "Job unavailable");
  assert.equal(uploadUploaderLabel(upload), "U-9");
  assert.equal(uploadCustomerLabel(upload), "Not set");
  assert.equal(gpsStatusLabel(upload), "Not requested");
});

test("findSelectedUpload tolerates missing arrays and falls back safely", () => {
  assert.equal(findSelectedUpload(undefined, undefined, "UPL-1"), null);

  const upload = { id: "UPL-1", caption: "Selected" };
  assert.deepEqual(findSelectedUpload([], [upload], "UPL-1"), upload);
});

test("upload support context summarizes visible office evidence without file or financial data", () => {
  const uploads = [
    {
      id: "UPL-1",
      jobId: "J-1",
      uploadedBy: "U-1",
      uploadedByName: "Ava",
      uploadedAt: "2026-04-25T10:00:00.000Z",
      caption: "Forms ready",
      notes: "North edge",
      fileName: "forms-ready.png",
      fileType: "image/png",
      job: { title: "Driveway", customer: "Carter", estimateTotal: 12000, margin: 0.4 },
      latitude: 44.9,
      longitude: -123.0,
      storagePath: "uploads/private/forms-ready.png",
      contentUrl: "/api/uploads/UPL-1/content",
      dataUrl: "data:image/png;base64,secret",
      internalCost: 2400,
    },
    {
      id: "UPL-2",
      jobId: "J-2",
      uploadedBy: "U-2",
      uploadedByName: "Ben",
      uploadedAt: "2026-04-24T10:00:00.000Z",
      caption: "",
      notes: "",
      fileName: "no-caption.jpg",
      fileType: "image/jpeg",
      job: { title: "Patio", customer: "Nguyen" },
      locationUnavailableReason: "Location permission denied by user.",
    },
  ];
  const context = buildUploadSupportContext({
    user: { id: "U-ADMIN", name: "Office Admin", role: "Administrator" },
    permissions: { uploads: { canManageAll: true, canCreate: true } },
    visibleRows: uploads,
    selectedUpload: uploads[0],
    filters: { archived: "Active only", jobId: "All jobs", uploaderId: "All uploaders", date: "All dates", gps: "All locations", query: "forms" },
    allowedJobs: [{ id: "J-1" }, { id: "J-2" }],
  });

  assert.equal(context.workflow, "Photos / uploads");
  assert.equal(context.blockerLevel, "Slowing work down");
  assert.match(context.summary, /Scope: all visible company photo evidence/);
  assert.match(context.summary, /Visible uploads: 2/);
  assert.match(context.summary, /GPS captured: 1/);
  assert.match(context.summary, /missing captions or notes: 1/);
  assert.match(context.summary, /Selected upload: Forms ready for Driveway; uploaded by Ava on 2026-04-25; GPS status: Location captured/);
  assert.match(context.workaround, /no-caption\.jpg: Caption or notes missing/);
  assert.equal(JSON.stringify(context).includes("storagePath"), false);
  assert.equal(JSON.stringify(context).includes("contentUrl"), false);
  assert.equal(JSON.stringify(context).includes("data:image"), false);
  assert.equal(JSON.stringify(context).includes("44.9"), false);
  assert.equal(JSON.stringify(context).includes("-123"), false);
  assert.equal(JSON.stringify(context).includes("estimateTotal"), false);
  assert.equal(JSON.stringify(context).includes("internalCost"), false);
  assert.match(context.expected, /without exposing file contents, storage paths, content URLs, GPS coordinates, pricing, margin, payroll, hidden users, or unrelated jobs/);
});

test("upload support context stays limited to field-visible upload rows", () => {
  const fieldUpload = {
    id: "UPL-FIELD",
    jobId: "J-FIELD",
    uploadedBy: "U-FOREMAN",
    uploadedByName: "Field Foreman",
    uploadedAt: "2026-04-25T12:00:00.000Z",
    caption: "Progress photo",
    fileName: "progress.png",
    fileType: "image/png",
    job: { title: "Assigned Walkway" },
  };
  const hiddenUpload = {
    id: "UPL-HIDDEN",
    jobId: "J-HIDDEN",
    caption: "Hidden office upload",
    job: { title: "Hidden Office Job" },
  };
  const context = buildUploadSupportContext({
    user: { id: "U-FOREMAN", name: "Field Foreman", role: "Foreman" },
    permissions: { uploads: { canManageAll: false, canCreate: true } },
    visibleRows: [fieldUpload],
    selectedUpload: fieldUpload,
    allowedJobs: [{ id: "J-FIELD" }],
  });

  assert.match(context.summary, /Scope: assigned job photo evidence/);
  assert.match(context.summary, /Visible uploads: 1/);
  assert.match(context.summary, /Assigned Walkway/);
  assert.equal(JSON.stringify(context).includes(hiddenUpload.job.title), false);
  assert.equal(context.summary.includes("pricing"), false);
  assert.equal(context.summary.includes("payRate"), false);
});
