export const ALLOWED_UPLOAD_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "image/gif"];
export const MAX_UPLOAD_SIZE_BYTES = 8 * 1024 * 1024;

export function deriveAllowedUploadJobs(jobs) {
  return (Array.isArray(jobs) ? jobs : []).filter((job) => !job?.archivedAt);
}

export function uploadTitle(upload) {
  return upload?.caption || upload?.fileName || "Untitled upload";
}

export function uploadJobLabel(upload) {
  return upload?.job?.title || upload?.jobTitle || upload?.jobId || "Job unavailable";
}

export function uploadUploaderLabel(upload) {
  return upload?.uploadedByName || upload?.uploadedBy || "Unknown uploader";
}

export function uploadCustomerLabel(upload) {
  return upload?.job?.customer || upload?.customerName || "Not set";
}

export function findSelectedUpload(visibleUploads, uploads, selectedUploadId) {
  const safeVisibleUploads = Array.isArray(visibleUploads) ? visibleUploads : [];
  const safeUploads = Array.isArray(uploads) ? uploads : [];
  return safeVisibleUploads.find((upload) => upload?.id === selectedUploadId)
    || safeUploads.find((upload) => upload?.id === selectedUploadId)
    || null;
}

export function gpsStatusLabel(item) {
  if (!item) return "Not requested";
  if (item.latitude != null && item.longitude != null) return "Location captured";
  const reason = String(item.locationUnavailableReason || "").trim().toLowerCase();
  if (reason.includes("denied")) return "Location denied";
  if (reason) return "Location unavailable";
  return "Not requested";
}

export function deriveSelectedPhotoTakenAt(selectedAt = new Date()) {
  const normalized = selectedAt instanceof Date ? selectedAt : new Date(selectedAt);
  if (!Number.isNaN(normalized.getTime())) {
    return normalized.toISOString();
  }
  return new Date().toISOString();
}

export function deriveUploadDraftFromSelection(currentDraft, file, dataUrl, selectedAt = new Date()) {
  return {
    ...(currentDraft && typeof currentDraft === "object" ? currentDraft : {}),
    fileName: file?.name || "",
    fileType: file?.type || "",
    fileSize: Number(file?.size || 0),
    dataUrl: typeof dataUrl === "string" ? dataUrl : "",
    takenAtIso: deriveSelectedPhotoTakenAt(selectedAt),
  };
}

export function validateUploadFile(file) {
  if (!file) return "Choose a photo to upload.";
  if (!ALLOWED_UPLOAD_TYPES.includes(String(file.type || "").toLowerCase())) {
    return "Only image uploads are supported right now.";
  }
  if (Number(file.size || 0) > MAX_UPLOAD_SIZE_BYTES) {
    return `Images must be ${Math.round(MAX_UPLOAD_SIZE_BYTES / (1024 * 1024))}MB or smaller.`;
  }
  return "";
}

export function filterUploads(uploads, {
  jobId = "All jobs",
  uploaderId = "All uploaders",
  date = "All dates",
  gps = "All locations",
  archived = "Active only",
  query = "",
} = {}) {
  const normalizedQuery = String(query || "").trim().toLowerCase();

  return (Array.isArray(uploads) ? uploads : []).filter((upload) => {
    const hasGps = upload?.latitude != null && upload?.longitude != null;
    const uploadedDate = String(upload?.uploadedAt || upload?.createdAt || "").slice(0, 10);
    const matchesJob = jobId === "All jobs" ? true : upload?.jobId === jobId;
    const matchesUploader = uploaderId === "All uploaders" ? true : upload?.uploadedBy === uploaderId;
    const matchesDate = date === "All dates" ? true : uploadedDate === date;
    const matchesGps = gps === "All locations"
      ? true
      : gps === "Has GPS"
        ? hasGps
        : !hasGps;
    const matchesArchived = archived === "All uploads"
      ? true
      : archived === "Archived only"
        ? Boolean(upload?.archivedAt)
        : !upload?.archivedAt;
    const haystack = [
      upload?.fileName,
      upload?.caption,
      upload?.notes,
      upload?.uploadedByName,
      upload?.job?.title,
      upload?.job?.customer,
    ].filter(Boolean).join(" ").toLowerCase();
    const matchesQuery = normalizedQuery ? haystack.includes(normalizedQuery) : true;

    return matchesJob && matchesUploader && matchesDate && matchesGps && matchesArchived && matchesQuery;
  });
}

export function deriveUploadListState(uploads) {
  const safeUploads = Array.isArray(uploads) ? uploads : [];
  const jobOptions = Array.from(new Map(
    safeUploads
      .filter((upload) => !upload?.archivedAt && upload?.jobId)
      .map((upload) => [upload.jobId, { value: upload.jobId, label: uploadJobLabel(upload) }]),
  ).values()).sort((left, right) => left.label.localeCompare(right.label));

  const uploaderOptions = Array.from(new Map(
    safeUploads
      .filter((upload) => upload?.uploadedBy)
      .map((upload) => [upload.uploadedBy, { value: upload.uploadedBy, label: uploadUploaderLabel(upload) }]),
  ).values()).sort((left, right) => left.label.localeCompare(right.label));

  const dateOptions = Array.from(new Set(
    safeUploads.map((upload) => String(upload?.uploadedAt || upload?.createdAt || "").slice(0, 10)).filter(Boolean),
  )).sort().reverse();

  return {
    jobOptions,
    uploaderOptions,
    dateOptions,
  };
}

function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function hasGps(upload = {}) {
  return upload?.hasGps === true || (upload?.latitude != null && upload?.longitude != null);
}

function uploadDateLabel(upload = {}) {
  return String(upload?.uploadedAt || upload?.takenAt || upload?.createdAt || "").slice(0, 10) || "No date";
}

function uploadSupportScopeLabel(user = {}, permissions = {}) {
  if (permissions?.uploads?.canManageAll) return "all visible company photo evidence";
  if (permissions?.uploads?.canCreate) return "assigned job photo evidence";
  return `${String(user?.role || "role").trim() || "role"} visible photo evidence`;
}

function uploadSupportPriorityItems(uploads = [], limit = 3) {
  return (Array.isArray(uploads) ? uploads : [])
    .filter((upload) => !upload?.archivedAt)
    .map((upload) => {
      if (!String(upload?.caption || upload?.notes || "").trim()) {
        return { label: uploadTitle(upload), reason: "Caption or notes missing", priority: 1 };
      }
      if (!hasGps(upload)) {
        return { label: uploadTitle(upload), reason: gpsStatusLabel(upload), priority: 2 };
      }
      return null;
    })
    .filter(Boolean)
    .sort((left, right) => left.priority - right.priority || left.label.localeCompare(right.label))
    .slice(0, limit);
}

export function buildUploadSupportContext({
  user = {},
  permissions = {},
  visibleRows = [],
  selectedUpload = null,
  filters = {},
  allowedJobs = [],
} = {}) {
  const safeRows = Array.isArray(visibleRows) ? visibleRows : [];
  const activeRows = safeRows.filter((upload) => !upload?.archivedAt);
  const imageCount = safeRows.filter((upload) => String(upload?.fileType || "").startsWith("image/")).length;
  const gpsCount = safeRows.filter(hasGps).length;
  const missingGpsCount = safeRows.filter((upload) => !hasGps(upload)).length;
  const missingCaptionCount = safeRows.filter((upload) => !String(upload?.caption || upload?.notes || "").trim()).length;
  const archivedCount = safeRows.filter((upload) => upload?.archivedAt).length;
  const selectedText = selectedUpload
    ? [
      `${uploadTitle(selectedUpload)} for ${uploadJobLabel(selectedUpload)}`,
      `uploaded by ${uploadUploaderLabel(selectedUpload)} on ${uploadDateLabel(selectedUpload)}`,
      `GPS status: ${gpsStatusLabel(selectedUpload)}`,
    ].join("; ")
    : "No upload selected.";
  const priorityItems = uploadSupportPriorityItems(activeRows);
  const priorityText = priorityItems.length
    ? priorityItems.map((item) => `${item.label}: ${item.reason}`).join("; ")
    : "No visible upload has a caption or GPS follow-up flag in this view.";
  const filterText = [
    `archive ${filters.archived || "Active only"}`,
    `job ${filters.jobId || "All jobs"}`,
    `uploader ${filters.uploaderId || "All uploaders"}`,
    `date ${filters.date || "All dates"}`,
    `GPS ${filters.gps || "All locations"}`,
    filters.query ? `search "${filters.query}"` : "",
  ].filter(Boolean).join("; ");

  return {
    workflow: "Photos / uploads",
    blockerLevel: missingCaptionCount || missingGpsCount ? "Slowing work down" : "Not a blocker",
    followUpNeeded: missingCaptionCount || missingGpsCount ? "Manual photo evidence review" : "Photo evidence workflow question",
    summary: [
      `Photo Evidence support request for ${String(user?.name || user?.email || "workspace user").trim() || "workspace user"}.`,
      `Scope: ${uploadSupportScopeLabel(user, permissions)}.`,
      `Current filters: ${filterText}.`,
      `Visible uploads: ${safeRows.length}; active: ${activeRows.length}; images: ${imageCount}; GPS captured: ${gpsCount}; missing GPS: ${missingGpsCount}; missing captions or notes: ${missingCaptionCount}; archived in view: ${archivedCount}.`,
      `Selected upload: ${selectedText}`,
    ].join(" "),
    expected: "Keep photo evidence tied to visible jobs only, without exposing file contents, storage paths, content URLs, GPS coordinates, pricing, margin, payroll, hidden users, or unrelated jobs.",
    workaround: `Visible job options: ${pluralize(Array.isArray(allowedJobs) ? allowedJobs.length : 0, "job")}. Review queue in this view: ${priorityText}`,
  };
}
