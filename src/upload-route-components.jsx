import { useEffect, useRef, useState } from "react";

import { AssistantRail, Badge, Button, Card, CommandPageFrame, Icon, InputField, SectionHeader, SelectField, StateCard, TextAreaField, WorkQueueCard } from "./app-shell-components";
import { jobTitle } from "./job-utils";
import { gpsStatusLabel, uploadCapturedAt, uploadCustomerLabel, uploadEvidenceDateKey, uploadJobLabel, uploadTitle, uploadUploaderLabel } from "./upload-utils";

const UPLOAD_PREVIEW_CACHE_LIMIT = 24;
const uploadPreviewCache = new Map();

function getUploadPreviewCacheKey(upload) {
  if (!upload?.id) return "";
  return `${upload.id}:${upload.updatedAt || upload.uploadedAt || ""}`;
}

function getCachedUploadPreviewUrl(cacheKey) {
  if (!cacheKey) return "";
  const cachedEntry = uploadPreviewCache.get(cacheKey);
  if (!cachedEntry?.url) return "";
  uploadPreviewCache.delete(cacheKey);
  uploadPreviewCache.set(cacheKey, cachedEntry);
  return cachedEntry.url;
}

function storeUploadPreviewUrl(cacheKey, previewUrl) {
  if (!cacheKey || !previewUrl) return;
  const previousEntry = uploadPreviewCache.get(cacheKey);
  if (previousEntry?.url && previousEntry.url !== previewUrl) {
    URL.revokeObjectURL(previousEntry.url);
  }
  uploadPreviewCache.delete(cacheKey);
  uploadPreviewCache.set(cacheKey, { url: previewUrl });

  while (uploadPreviewCache.size > UPLOAD_PREVIEW_CACHE_LIMIT) {
    const oldestKey = uploadPreviewCache.keys().next().value;
    const oldestEntry = uploadPreviewCache.get(oldestKey);
    if (oldestEntry?.url) {
      URL.revokeObjectURL(oldestEntry.url);
    }
    uploadPreviewCache.delete(oldestKey);
  }
}

export async function fetchAuthenticatedUploadPreviewUrl(upload, token) {
  if (!upload?.contentUrl || !token) {
    throw new Error("Could not load the upload preview.");
  }

  const cacheKey = getUploadPreviewCacheKey(upload);
  const cachedPreviewUrl = getCachedUploadPreviewUrl(cacheKey);
  if (cachedPreviewUrl) return cachedPreviewUrl;

  const response = await fetch(upload.contentUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Could not load the upload preview.");
  }

  const blob = await response.blob();
  const previewUrl = URL.createObjectURL(blob);
  storeUploadPreviewUrl(cacheKey, previewUrl);
  return previewUrl;
}

function uploadDateTimeLabel(value) {
  if (!value) return "Not recorded";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not recorded";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function uploadFileSizeLabel(bytes) {
  const size = Number(bytes || 0);
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  if (size >= 1024) return `${Math.round(size / 1024)} KB`;
  return `${size} B`;
}

function todayDateInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export function UploadListCard({ upload, selected, onSelect }) {
  return (
    <button type="button" onClick={() => onSelect(upload.id)} className={`co-mobile-record-card w-full min-w-0 max-w-full rounded-2xl border p-4 text-left transition ${selected ? "is-selected border-orange-200 bg-orange-50/70" : "border-slate-200 bg-white hover:border-orange-200 hover:bg-orange-50/50"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-950">{uploadTitle(upload)}</p>
          <p className="mt-1 break-words text-xs font-bold text-slate-500">{uploadJobLabel(upload)} / {uploadUploaderLabel(upload)}</p>
        </div>
        <Badge tone={upload.hasGps ? "green" : "slate"}>{gpsStatusLabel(upload)}</Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
        <span>{uploadDateTimeLabel(upload.takenAt)}</span>
        <span>{uploadFileSizeLabel(upload.fileSize)}</span>
        {upload.archivedAt ? <span>Archived</span> : null}
      </div>
      {upload.notes ? <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-600">{upload.notes}</p> : null}
    </button>
  );
}

export function UploadMobileAccordionCard({ title, summary, badge, defaultOpen = false, children }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`co-mobile-accordion rounded-2xl border bg-white/95 shadow-sm md:hidden ${isOpen ? "is-open border-orange-200" : "border-slate-200"}`}>
      <button type="button" className="flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2.5 text-left" aria-expanded={isOpen} onClick={() => setIsOpen((current) => !current)}>
        <span className="min-w-0">
          <span className="block truncate text-sm font-black text-slate-950">{title}</span>
          {summary ? <span className="mt-0.5 block truncate text-xs font-bold text-slate-500">{summary}</span> : null}
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          {badge}
          <span className={`co-mobile-toggle-pill inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black ${isOpen ? "is-active bg-orange-600 text-white" : "bg-orange-50 text-orange-700"}`}>
            {isOpen ? "Hide" : "Show"}
            <span aria-hidden="true">{isOpen ? "^" : "v"}</span>
          </span>
        </span>
      </button>
      {isOpen ? <div className="border-t border-slate-200 p-2.5">
        {children}
      </div> : null}
    </div>
  );
}

export function UploadMobileFieldGroup({ title, summary, defaultOpen = false, children }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="co-mobile-field-group rounded-2xl border border-slate-200 bg-white">
      <button type="button" className="flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2.5 text-left" aria-expanded={isOpen} onClick={() => setIsOpen((current) => !current)}>
        <span className="min-w-0">
          <span className="block text-sm font-black text-slate-950">{title}</span>
          {summary ? <span className="mt-0.5 block text-xs font-bold text-slate-500">{summary}</span> : null}
        </span>
        <span className="co-mobile-toggle-pill shrink-0 rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-black text-orange-700">{isOpen ? "Hide ^" : "Show v"}</span>
      </button>
      {isOpen ? <div className="grid gap-3 border-t border-slate-200 p-3">
        {children}
      </div> : null}
    </div>
  );
}

export function AuthenticatedUploadPreview({ upload, token, className = "h-64 w-full rounded-2xl object-cover" }) {
  const [previewUrl, setPreviewUrl] = useState("");
  const [status, setStatus] = useState("idle");
  const cacheKey = getUploadPreviewCacheKey(upload);

  useEffect(() => {
    if (!upload?.contentUrl || !token) {
      setPreviewUrl("");
      setStatus("idle");
      return undefined;
    }

    let cancelled = false;
    setStatus("loading");

    fetchAuthenticatedUploadPreviewUrl(upload, token)
      .then((nextPreviewUrl) => {
        if (cancelled) return;
        setPreviewUrl(nextPreviewUrl);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) {
          setPreviewUrl("");
          setStatus("error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [cacheKey, token, upload?.contentUrl]);

  if (status === "ready" && previewUrl) {
    return <img src={previewUrl} alt={upload.fileName || "Uploaded evidence"} className={className} />;
  }

  return (
    <div className={`flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-500 ${className}`}>
      {status === "loading" ? "Loading preview..." : "Preview unavailable"}
    </div>
  );
}

export function UploadCreateCard({ canCreate, jobs, draft, setDraft, onRequestLocation, onFileChange, onSubmit, loading, fileError }) {
  const cameraInputRef = useRef(null);
  const libraryInputRef = useRef(null);

  function handleOpenPicker(event, ref) {
    event.preventDefault();
    event.stopPropagation();
    ref.current?.click();
  }

  function handleFileInputChange(event) {
    event.preventDefault();
    event.stopPropagation();
    onFileChange(event);
  }

  function handleRequestLocationClick(event) {
    event.preventDefault();
    event.stopPropagation();
    onRequestLocation();
  }

  if (!canCreate) {
    return (
      <Card className="p-5">
        <SectionHeader title="Upload photo" description="This role cannot create upload evidence right now." />
        <StateCard title="Read-only" description="Photo Evidence is limited to office and field users with allowed job access." tone="slate" />
      </Card>
    );
  }

  if (jobs.length === 0) {
    return (
      <Card className="p-5">
        <SectionHeader title="Upload photo" description="A job link is required for photo evidence." />
        <StateCard title="No assigned job available for upload" description="Contact office if this is wrong or if the job should already be assigned." tone="slate" />
      </Card>
    );
  }

  const selectedJob = jobs.find((job) => job.id === draft.jobId);
  const uploadSummary = draft.fileName
    ? `${draft.fileName} / ${selectedJob ? jobTitle(selectedJob) : "job pending"}`
    : `${selectedJob ? jobTitle(selectedJob) : "select job"} and add photo`;
  const selectedJobLabel = selectedJob ? jobTitle(selectedJob) : "Select assigned job";
  const fileLabel = draft.fileName || "No photo selected";
  const gpsLabel = gpsStatusLabel(draft);
  const canUploadEvidence = Boolean(draft.jobId && draft.dataUrl) && !loading;
  const uploadReadyCount = [draft.jobId, draft.dataUrl].filter(Boolean).length;
  const contextCount = [draft.caption, draft.notes, draft.latitude != null && draft.longitude != null].filter(Boolean).length;
  const uploadReadinessLabel = canUploadEvidence ? "Ready to upload" : `${2 - uploadReadyCount} required step${2 - uploadReadyCount === 1 ? "" : "s"} left`;

  return (
    <>
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileInputChange} className="hidden" tabIndex={-1} />
      <input ref={libraryInputRef} type="file" accept="image/*" onChange={handleFileInputChange} className="hidden" tabIndex={-1} />

      <UploadMobileAccordionCard title="Upload photo evidence" summary={uploadSummary} badge={<Badge tone="orange">New</Badge>} defaultOpen>
        <form className="co-uploads-create-mobile-form grid gap-3" onSubmit={onSubmit} noValidate>
          <div className="co-uploads-create-target">
            <span>Evidence target</span>
            <strong>{selectedJobLabel}</strong>
            <p>{fileLabel}</p>
            <div className="co-uploads-create-target-meta">
              <span>{uploadReadinessLabel}</span>
              <span>{contextCount ? `${contextCount} context item${contextCount === 1 ? "" : "s"}` : "Caption optional"}</span>
              <span>{gpsLabel}</span>
            </div>
          </div>
          <div className="co-uploads-capture-actions co-uploads-capture-actions-mobile">
            <Button type="button" className="co-uploads-capture-primary" onClick={(event) => handleOpenPicker(event, cameraInputRef)} disabled={loading}>
              <Icon name="upload" />
              Take Photo
            </Button>
            <Button type="button" variant="secondary" className="co-uploads-capture-secondary" onClick={(event) => handleOpenPicker(event, libraryInputRef)} disabled={loading}>
              <Icon name="document" />
              Upload Existing
            </Button>
          </div>
          <UploadMobileFieldGroup title="Job / report" summary={selectedJob ? jobTitle(selectedJob) : "Select assigned job"}>
            <SelectField label="Job" value={draft.jobId} onChange={(event) => setDraft((current) => ({ ...current, jobId: event.target.value }))}>
              {jobs.map((job) => <option key={job.id} value={job.id}>{jobTitle(job)}</option>)}
            </SelectField>
          </UploadMobileFieldGroup>
          <UploadMobileFieldGroup title="Photo / file" summary={draft.fileName || "Choose a photo"} defaultOpen>
            {draft.dataUrl ? <img src={draft.dataUrl} alt="Selected upload preview" className="h-40 w-full rounded-2xl object-cover" /> : null}
            {fileError ? <StateCard title="Upload file issue" description={fileError} tone="red" /> : null}
            {!draft.dataUrl && !fileError ? <StateCard title="Choose photo evidence" description="Take a jobsite photo or upload an existing image before submitting evidence." tone="slate" /> : null}
          </UploadMobileFieldGroup>
          <UploadMobileFieldGroup title="Caption / notes" summary={[draft.caption, draft.notes].filter(Boolean).length ? "Notes added" : "Optional"}>
            <InputField label="Caption" value={draft.caption} onChange={(event) => setDraft((current) => ({ ...current, caption: event.target.value }))} placeholder="Pour finish before washout" />
            <TextAreaField label="Notes" value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Optional context for the office or report reviewer." />
          </UploadMobileFieldGroup>
          <UploadMobileFieldGroup title="Timestamp / GPS" summary={gpsStatusLabel(draft)}>
            <InputField label="Taken at" type="datetime-local" value={draft.takenAt} onChange={(event) => setDraft((current) => ({ ...current, takenAt: event.target.value }))} />
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              <p><span className="font-black text-slate-950">GPS status:</span> {gpsStatusLabel(draft)}</p>
              {draft.locationUnavailableReason ? <p className="mt-1">{draft.locationUnavailableReason}</p> : null}
              {draft.latitude != null && draft.longitude != null ? <p className="mt-1">{draft.latitude.toFixed(5)}, {draft.longitude.toFixed(5)} / accuracy {Math.round(draft.locationAccuracy || 0)} m</p> : null}
            </div>
            <Button type="button" variant="secondary" onClick={handleRequestLocationClick} disabled={loading}>Capture location</Button>
          </UploadMobileFieldGroup>
          <UploadMobileFieldGroup title="Extra details" summary={draft.fileName ? uploadFileSizeLabel(draft.fileSize) : "File details pending"}>
            {draft.fileName ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                <p><span className="font-black text-slate-950">Selected photo:</span> {draft.fileName}</p>
                <p className="mt-1"><span className="font-black text-slate-950">File type:</span> {draft.fileType || "Unknown"}</p>
                <p className="mt-1"><span className="font-black text-slate-950">File size:</span> {uploadFileSizeLabel(draft.fileSize)}</p>
              </div>
            ) : (
              <StateCard title="No file selected yet" description="Choose a photo before uploading evidence." tone="slate" />
            )}
          </UploadMobileFieldGroup>
          <div className="co-uploads-create-action-stack co-uploads-create-action-stack-mobile">
            <Button type="submit" className="co-uploads-upload-cta" disabled={loading || !draft.jobId || !draft.dataUrl}>
              <Icon name="upload" />
              Upload evidence
            </Button>
            <p>Submits the real job-linked photo record with the selected file and metadata.</p>
          </div>
        </form>
      </UploadMobileAccordionCard>

      <Card className="co-uploads-create-card hidden overflow-hidden md:block">
        <div className="co-uploads-create-header border-b border-slate-200 bg-white p-4">
          <SectionHeader title="Upload photo evidence" description="Capture job documentation with optional location metadata. Upload still works if location is denied." />
        </div>
        <form className="co-uploads-create-form p-4" onSubmit={onSubmit} noValidate>
          <div className="co-uploads-create-target">
            <span>Evidence target</span>
            <strong>{selectedJobLabel}</strong>
            <p>{fileLabel}</p>
            <div className="co-uploads-create-target-meta">
              <span>{uploadReadinessLabel}</span>
              <span>{contextCount ? `${contextCount} context item${contextCount === 1 ? "" : "s"}` : "Caption optional"}</span>
              <span>{gpsLabel}</span>
            </div>
          </div>
          <div className="co-uploads-create-center">
            <div className="co-uploads-capture-card">
              <span>Capture photo</span>
              <div className="co-uploads-capture-actions">
                <Button type="button" className="co-uploads-capture-primary" onClick={(event) => handleOpenPicker(event, cameraInputRef)} disabled={loading}>
                  <Icon name="upload" />
                  Take Photo
                </Button>
                <Button type="button" variant="secondary" className="co-uploads-capture-secondary" onClick={(event) => handleOpenPicker(event, libraryInputRef)} disabled={loading}>
                  <Icon name="document" />
                  Upload Existing
                </Button>
              </div>
            </div>
            <div className="co-uploads-create-fields">
              <SelectField label="Job" value={draft.jobId} onChange={(event) => setDraft((current) => ({ ...current, jobId: event.target.value }))}>
                {jobs.map((job) => <option key={job.id} value={job.id}>{jobTitle(job)}</option>)}
              </SelectField>
              <InputField label="Taken at" type="datetime-local" value={draft.takenAt} onChange={(event) => setDraft((current) => ({ ...current, takenAt: event.target.value }))} />
              <InputField label="Caption" value={draft.caption} onChange={(event) => setDraft((current) => ({ ...current, caption: event.target.value }))} placeholder="Pour finish before washout" />
              <div className="co-uploads-create-field-wide">
                <TextAreaField label="Notes" value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Optional context for the office or report reviewer." />
              </div>
            </div>
            <div className="co-uploads-create-evidence-grid">
              <div className="co-uploads-selected-file-card">
                <span>Selected file</span>
                {draft.fileName ? (
                  <>
                    <strong>{draft.fileName}</strong>
                    <p>{draft.fileType || "Unknown"} / {uploadFileSizeLabel(draft.fileSize)}</p>
                  </>
                ) : (
                  <>
                    <strong>No file selected</strong>
                    <p>Choose a photo before uploading evidence.</p>
                  </>
                )}
              </div>
              <div className="co-uploads-gps-card">
                <span>GPS status</span>
                <strong>{gpsLabel}</strong>
                {draft.locationUnavailableReason ? <p>{draft.locationUnavailableReason}</p> : null}
                {draft.latitude != null && draft.longitude != null ? <p>{draft.latitude.toFixed(5)}, {draft.longitude.toFixed(5)} / accuracy {Math.round(draft.locationAccuracy || 0)} m</p> : <p>Location is added only when you tap capture.</p>}
                <Button type="button" variant="secondary" size="sm" onClick={handleRequestLocationClick} disabled={loading}>Capture location</Button>
              </div>
            </div>
            {draft.dataUrl ? <img src={draft.dataUrl} alt="Selected upload preview" className="co-uploads-selected-preview h-48 w-full rounded-2xl object-cover" /> : null}
            {fileError ? <StateCard title="Upload file issue" description={fileError} tone="red" /> : null}
          </div>
          <div className="co-uploads-create-action-stack">
            <Button type="submit" className="co-uploads-upload-cta" disabled={loading || !draft.jobId || !draft.dataUrl}>
              <Icon name="upload" />
              Upload evidence
            </Button>
            <p>Submits the real job-linked photo record with the selected file, timestamp, optional GPS, caption, and notes.</p>
            <div className="co-uploads-create-checks">
              <span data-state={draft.jobId ? "ready" : "needs"}>Job</span>
              <span data-state={draft.dataUrl ? "ready" : "needs"}>Photo</span>
              <span data-state={draft.latitude != null && draft.longitude != null ? "ready" : "needs"}>GPS</span>
            </div>
          </div>
        </form>
      </Card>

      <Card className="hidden">
      <SectionHeader title="Upload photo" description="Capture field documentation with optional location metadata. Upload still works if location is denied." />
      <form className="grid gap-3" onSubmit={onSubmit} noValidate>
        <SelectField label="Job" value={draft.jobId} onChange={(event) => setDraft((current) => ({ ...current, jobId: event.target.value }))}>
          {jobs.map((job) => <option key={job.id} value={job.id}>{jobTitle(job)}</option>)}
        </SelectField>
        <div className="grid gap-3 sm:grid-cols-2">
          <Button type="button" className="w-full" onClick={(event) => handleOpenPicker(event, cameraInputRef)} disabled={loading}>
            <Icon name="upload" />
            Take Photo
          </Button>
          <Button type="button" variant="secondary" className="w-full" onClick={(event) => handleOpenPicker(event, libraryInputRef)} disabled={loading}>
            <Icon name="document" />
            Upload Existing Photo
          </Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <InputField label="Caption" value={draft.caption} onChange={(event) => setDraft((current) => ({ ...current, caption: event.target.value }))} placeholder="Pour finish before washout" />
          <InputField label="Taken at" type="datetime-local" value={draft.takenAt} onChange={(event) => setDraft((current) => ({ ...current, takenAt: event.target.value }))} />
        </div>
        <TextAreaField label="Notes" value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Optional context for the office or report reviewer." />
        {draft.fileName ? (
          <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 text-sm text-slate-600">
            <p><span className="font-black text-slate-950">Selected photo:</span> {draft.fileName}</p>
            <p className="mt-1"><span className="font-black text-slate-950">Taken at:</span> {draft.takenAt ? uploadDateTimeLabel(new Date(draft.takenAt).toISOString()) : "Will be recorded when selected"}</p>
            <p className="mt-1"><span className="font-black text-slate-950">Uploaded at:</span> Recorded when you submit</p>
          </div>
        ) : null}
        {draft.dataUrl ? <img src={draft.dataUrl} alt="Selected upload preview" className="h-48 w-full rounded-2xl object-cover" /> : null}
        {fileError ? <StateCard title="Upload file issue" description={fileError} tone="red" /> : null}
        <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-sm text-slate-600">
          <p><span className="font-black text-slate-950">GPS status:</span> {gpsStatusLabel(draft)}</p>
          {draft.locationUnavailableReason ? <p className="mt-1">{draft.locationUnavailableReason}</p> : null}
          <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Location is used for job documentation only when you tap Capture Location.</p>
          {draft.latitude != null && draft.longitude != null ? <p className="mt-1">{draft.latitude.toFixed(5)}, {draft.longitude.toFixed(5)} / accuracy {Math.round(draft.locationAccuracy || 0)} m</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={handleRequestLocationClick} disabled={loading}>Capture location</Button>
          <Button type="submit" disabled={loading || !draft.jobId || !draft.dataUrl}>Upload evidence</Button>
        </div>
      </form>
      </Card>
    </>
  );
}

export function UploadsTablePolished({ rows, selectedId, onSelect }) {
  return (
    <>
      <div className="co-uploads-mobile-list-surface md:hidden">
        <div className="co-field-mobile-section-head">
          <span>
            <strong>Evidence in view</strong>
            <em>{rows.length} upload{rows.length === 1 ? "" : "s"} ready for review</em>
          </span>
          <b>{rows.length}</b>
        </div>
        <div className="co-uploads-mobile-list grid gap-3 p-3">
          {rows.map((upload) => {
            const selected = upload.id === selectedId;

            return (
              <button
                key={upload.id}
                type="button"
                onClick={() => onSelect(upload.id)}
                className={`co-uploads-mobile-card co-mobile-record-card w-full rounded-[1.05rem] border p-4 text-left transition ${selected ? "is-selected border-orange-200 bg-orange-50/75" : "border-slate-200 bg-white hover:border-orange-200 hover:bg-orange-50/35"}`}
              >
                <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-base font-black text-slate-950">{uploadTitle(upload)}</p>
                    <p className="mt-1 break-words text-xs font-bold text-slate-500">{uploadJobLabel(upload)} / {uploadUploaderLabel(upload)}</p>
                  </div>
                  <Badge tone={upload.hasGps ? "green" : "slate"}>{gpsStatusLabel(upload)}</Badge>
                </div>
                <div className="co-uploads-mobile-metrics">
                  <span>Captured <strong>{uploadDateTimeLabel(uploadCapturedAt(upload))}</strong></span>
                  <span>Size <strong>{uploadFileSizeLabel(upload.fileSize)}</strong></span>
                  <span>Status <strong>{upload.archivedAt ? "Archived" : "Active"}</strong></span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <div className="co-uploads-list-scroll hidden min-w-0 overflow-auto md:block">
        <table className="co-uploads-command-table w-full min-w-[900px] text-left">
          <thead>
            <tr>
              <th>Evidence / Job</th>
              <th>Uploader</th>
              <th>Captured</th>
              <th>GPS</th>
              <th>File</th>
              <th>Notes</th>
              <th>Open</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((upload) => {
              const selected = upload.id === selectedId;

              return (
                <tr key={upload.id} onClick={() => onSelect(upload.id)} className={`cursor-pointer transition hover:bg-orange-50/45 ${selected ? "bg-orange-50/70" : ""}`}>
                  <td>
                    <p className="font-black text-slate-950">{uploadTitle(upload)}</p>
                    <p className="text-xs font-bold text-slate-500">{uploadJobLabel(upload)} / {uploadCustomerLabel(upload)}</p>
                  </td>
                  <td className="font-bold text-slate-700">{uploadUploaderLabel(upload)}</td>
                  <td className="font-bold text-slate-700">{uploadDateTimeLabel(uploadCapturedAt(upload))}</td>
                  <td><Badge tone={upload.hasGps ? "green" : "slate"}>{gpsStatusLabel(upload)}</Badge></td>
                  <td>
                    <p className="font-bold text-slate-700">{uploadFileSizeLabel(upload.fileSize)}</p>
                    <p className="text-xs font-bold text-slate-500">{upload.fileType || "Unknown"}</p>
                  </td>
                  <td>
                    <p className="font-bold text-slate-700">{upload.notes || upload.caption || "No notes yet"}</p>
                  </td>
                  <td>
                    <button type="button" className="co-uploads-icon-button" onClick={(event) => { event.stopPropagation(); onSelect(upload.id); }} aria-label={`Open upload ${upload.id}`}>
                      <Icon name="arrowUpRight" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function UploadsCommandRailPolished({
  upload,
  token,
  canCreate,
  canManage,
  disabled,
  onArchive,
  onOpenTool,
}) {
  if (!upload) {
    return (
      <div className="co-uploads-right-rail space-y-4">
        <Card className="co-uploads-rail-card p-4">
          <SectionHeader title="Evidence Console" description="Select an upload or capture new photo evidence." />
          <div className="co-uploads-empty-rail">
            <span><Icon name="upload" /></span>
            <strong>No upload selected</strong>
            <p>Choose a row to review the image, job link, timestamp, GPS status, file metadata, and notes here.</p>
          </div>
          {canCreate ? <Button type="button" className="mt-3 w-full" onClick={() => onOpenTool("upload")}>Upload Photo</Button> : null}
        </Card>
      </div>
    );
  }

  return (
    <div className="co-uploads-right-rail space-y-4">
      <Card className="co-uploads-rail-card p-4">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Selected evidence</p>
            <h3 className="mt-2 break-words text-xl font-black leading-tight text-slate-950">{uploadTitle(upload)}</h3>
            <p className="mt-1 break-words text-xs font-black text-slate-500">{uploadJobLabel(upload)} / {uploadUploaderLabel(upload)}</p>
          </div>
          <Badge tone={upload.hasGps ? "green" : "slate"}>{gpsStatusLabel(upload)}</Badge>
        </div>

        <AuthenticatedUploadPreview upload={upload} token={token} className="co-uploads-rail-preview mt-3 h-44 w-full rounded-xl object-cover" />

        <div className="co-uploads-selected-metrics">
          <div>
            <span>Captured</span>
            <strong>{uploadDateTimeLabel(uploadCapturedAt(upload))}</strong>
          </div>
          <div>
            <span>File</span>
            <strong>{uploadFileSizeLabel(upload.fileSize)}</strong>
          </div>
          <div>
            <span>Customer</span>
            <strong>{uploadCustomerLabel(upload)}</strong>
          </div>
          <div>
            <span>Status</span>
            <strong>{upload.archivedAt ? "Archived" : "Active"}</strong>
          </div>
        </div>

        <div className="co-uploads-note-panel">
          <span>Caption / notes</span>
          <p>{upload.notes || upload.caption || "No notes recorded yet."}</p>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button type="button" size="sm" onClick={() => onOpenTool("details")}>Edit Notes</Button>
          {canManage && !upload.archivedAt ? <Button type="button" size="sm" variant="secondary" onClick={() => onArchive(upload.id)} disabled={disabled}>Archive</Button> : null}
        </div>
      </Card>

      <Card className="co-uploads-rail-card p-4">
        <SectionHeader title="Evidence Health" description="Photo evidence is strongest when job, time, and location context are present." />
        <div className="co-uploads-readiness-list">
          <span data-state={upload.jobId ? "ready" : "needs"}>Job link <strong>{upload.jobId ? "Set" : "Needed"}</strong></span>
          <span data-state={upload.hasGps ? "ready" : "needs"}>GPS metadata <strong>{upload.hasGps ? "Captured" : gpsStatusLabel(upload)}</strong></span>
          <span data-state={upload.caption || upload.notes ? "ready" : "needs"}>Notes <strong>{upload.caption || upload.notes ? "Added" : "Optional"}</strong></span>
        </div>
      </Card>
    </div>
  );
}


export function UploadsFieldOperatorPanel({
  upload,
  visibleRows,
  allowedJobs,
  todayCount,
  currentJobUploadCount,
  currentJobLabel,
  missingGpsCount,
  missingNotesCount,
  canCreate,
  onOpenTool,
  onJumpToBoard,
}) {
  const hasSelectedUpload = Boolean(upload);
  const summaryItems = [
    { label: "Today", value: todayCount, tone: todayCount ? "orange" : "slate" },
    { label: currentJobLabel || "Current job", value: currentJobUploadCount, tone: currentJobUploadCount ? "orange" : "slate" },
    { label: "Missing GPS", value: missingGpsCount, tone: missingGpsCount ? "amber" : "green" },
    { label: "Caption gaps", value: missingNotesCount, tone: missingNotesCount ? "amber" : "green" },
  ];

  return (
    <div className="mx-auto w-full max-w-[1520px] min-w-0 px-5 pb-3 sm:px-6 lg:px-6">
      <Card className="co-field-operator-panel co-uploads-field-panel overflow-hidden">
        <div className="co-field-operator-shell">
          <div className="co-field-operator-copy min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Badge tone="orange">Field Photo Evidence</Badge>
              <Badge tone={canCreate ? "green" : "slate"}>{canCreate ? "Upload ready" : "Read only"}</Badge>
              {hasSelectedUpload ? <Badge tone={upload.hasGps ? "green" : "amber"}>{gpsStatusLabel(upload)}</Badge> : <Badge tone="slate">Select evidence</Badge>}
            </div>
            <h2>{hasSelectedUpload ? uploadTitle(upload) : "Photo Evidence ready"}</h2>
            <p>
              {hasSelectedUpload
                ? `${uploadJobLabel(upload)} / ${upload.caption || upload.notes ? "Caption context added" : "Caption or note still helps the office."}`
                : canCreate
                  ? "Capture job-linked photos, add a quick caption, and keep timestamp or GPS context with the field record."
                  : "Review assigned job evidence without office-only controls or company setup data."}
            </p>
            <div className="co-field-operator-address">
              <Icon name="upload" />
              <span>{hasSelectedUpload ? `${uploadJobLabel(upload)} / ${uploadUploaderLabel(upload)}` : `${allowedJobs.length} assigned job${allowedJobs.length === 1 ? "" : "s"}`}</span>
            </div>
          </div>

          <div className="co-field-operator-actions">
            {canCreate ? (
              <Button type="button" onClick={() => onOpenTool("upload")}>
                <Icon name="upload" />
                Upload Photo
              </Button>
            ) : null}
            {hasSelectedUpload ? (
              <Button type="button" variant="secondary" onClick={() => onOpenTool("details")}>
                <Icon name="clipboard" />
                Details
              </Button>
            ) : null}
            <Button type="button" variant={canCreate || hasSelectedUpload ? "secondary" : undefined} onClick={onJumpToBoard}>
              <Icon name="layers" />
              View Board
            </Button>
          </div>
        </div>

        <div className="co-field-operator-strip">
          {summaryItems.map((item) => (
            <div key={item.label} data-tone={item.tone}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function UploadsMobileFocusPanel({
  upload,
  latestUpload,
  visibleCount,
  todayCount,
  currentJobUploadCount,
  currentJobLabel,
  gpsCount,
  missingGpsCount,
  missingNotesCount,
  canCreate,
  onUpload,
  onOpenToday,
  onOpenCurrentJob,
  onOpenMissingGps,
  onOpenCaptionGap,
  onOpenLatest,
  onJumpToBoard,
}) {
  const focusUpload = upload || latestUpload;

  return (
    <div className="co-uploads-mobile-focus mx-auto w-full max-w-[1520px] min-w-0 px-4 pb-3 md:hidden">
      <div className="co-uploads-mobile-focus-card">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Badge tone="orange">Photo Evidence</Badge>
          <Badge tone={todayCount ? "orange" : "slate"}>{todayCount} today</Badge>
          <Badge tone={currentJobUploadCount ? "orange" : "slate"}>{currentJobUploadCount} current job</Badge>
          <Badge tone={missingGpsCount ? "amber" : "green"}>{missingGpsCount ? `${missingGpsCount} GPS gap${missingGpsCount === 1 ? "" : "s"}` : "GPS ready"}</Badge>
          <Badge tone={missingNotesCount ? "amber" : "green"}>{missingNotesCount ? `${missingNotesCount} caption gap${missingNotesCount === 1 ? "" : "s"}` : "Captions ready"}</Badge>
        </div>
        <h2>{focusUpload ? uploadTitle(focusUpload) : "Photo Evidence board"}</h2>
        <p>{focusUpload ? `${uploadJobLabel(focusUpload)} / ${uploadUploaderLabel(focusUpload)}` : `Capture job-linked proof, review today's uploads, and keep photo evidence tied to ${currentJobLabel || "the current job"}.`}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {canCreate ? (
            <Button type="button" onClick={onUpload}>
              <Icon name="upload" />
              Upload Photo
            </Button>
          ) : (
            <Button type="button" onClick={onJumpToBoard}>
              <Icon name="layers" />
              View Board
            </Button>
          )}
          <Button type="button" variant="secondary" onClick={onJumpToBoard}>
            <Icon name="layers" />
            Evidence Board
          </Button>
        </div>
      </div>
      <div className="co-uploads-mobile-focus-grid">
        <button type="button" data-tone={todayCount ? "orange" : "slate"} onClick={onOpenToday}>
          <strong>{todayCount}</strong>
          <span>Today</span>
        </button>
        <button type="button" data-tone={currentJobUploadCount ? "orange" : "slate"} onClick={onOpenCurrentJob}>
          <strong>{currentJobUploadCount}</strong>
          <span>Current job</span>
        </button>
        <button type="button" data-tone={missingGpsCount ? "amber" : "green"} onClick={onOpenMissingGps}>
          <strong>{missingGpsCount}</strong>
          <span>Missing GPS</span>
        </button>
        <button type="button" data-tone={missingNotesCount ? "amber" : "green"} onClick={onOpenCaptionGap}>
          <strong>{missingNotesCount}</strong>
          <span>Caption gaps</span>
        </button>
      </div>
    </div>
  );
}


export function UploadsProofWorkbench({
  visibleRows,
  selectedUpload,
  latestVisibleUpload,
  sessionToken,
  evidenceCommandItems,
  evidenceNextAction,
  evidenceNextDetail,
  visibleCount,
  todayUploadCount,
  currentJobUploadCount,
  currentEvidenceJobLabel,
  gpsCount,
  missingGpsCount,
  missingNotesCount,
  imageCount,
  canCreate,
  onUpload,
  onJumpToBoard,
  onOpenToday,
  onOpenCurrentJob,
  onOpenMissingGps,
  onOpenCaptionGap,
  onOpenUpload,
  onSetActive,
  onSetGps,
}) {
  const focusUpload = selectedUpload || latestVisibleUpload || visibleRows[0] || null;
  const queueRows = visibleRows.slice(0, 6);
  const kpis = [
    { label: "Visible evidence", value: visibleCount, helper: "Current proof board", tone: visibleCount ? "orange" : "slate", action: "Open board", onClick: onJumpToBoard },
    { label: "Today", value: todayUploadCount, helper: "Captured today", tone: todayUploadCount ? "orange" : "slate", action: "Open today", onClick: onOpenToday },
    { label: "GPS captured", value: gpsCount, helper: "Location context present", tone: gpsCount ? "green" : "slate", action: "View GPS", onClick: () => onSetGps("Has GPS") },
    { label: "Missing proof context", value: missingGpsCount + missingNotesCount, helper: "GPS or caption gaps", tone: missingGpsCount || missingNotesCount ? "amber" : "green", action: "Review gaps", onClick: missingGpsCount ? onOpenMissingGps : onOpenCaptionGap },
  ];

  function uploadStatus(upload) {
    if (upload.archivedAt) return { label: "Archived", tone: "slate" };
    if (!upload.hasGps) return { label: "GPS gap", tone: "amber" };
    if (!String(upload.caption || upload.notes || "").trim()) return { label: "Caption gap", tone: "orange" };
    return { label: "Ready", tone: "green" };
  }

  return (
    <CommandPageFrame
      className="co-proof-engine-frame co-uploads-proof-frame"
      kpis={
        <div className="co-proof-engine-kpis">
          {kpis.map((item) => (
            <button key={item.label} type="button" className="co-proof-engine-kpi" data-tone={item.tone} onClick={item.onClick}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <em>{item.helper}</em>
              <b>{item.action}</b>
            </button>
          ))}
        </div>
      }
      rail={
        <AssistantRail
          eyebrow="Apex Assistant"
          title="Photo Evidence"
          description={`${evidenceNextAction}. ${evidenceNextDetail}`}
          priorities={evidenceCommandItems.map((item) => ({ value: item.value, label: item.label, tone: item.tone }))}
          actions={[
            canCreate ? { label: "Upload photo", icon: "upload", onClick: onUpload } : null,
            { label: "Review board", icon: "check", onClick: onJumpToBoard },
            { label: "Missing GPS", icon: "alert", onClick: onOpenMissingGps, disabled: !missingGpsCount },
          ].filter(Boolean)}
        />
      }
    >
      <section className="co-proof-engine-workbench" aria-label="Photo evidence proof engine">
        <div className="co-proof-engine-head">
          <div className="min-w-0">
            <p className="co-proof-engine-eyebrow">Jobsite proof intake</p>
            <h2>Photos, captions, GPS, reports, and billing proof</h2>
            <p>Office review starts with the newest job-linked evidence, proof gaps, and what is ready to attach to closeout.</p>
          </div>
          <div className="co-proof-engine-actions">
            <Button type="button" variant="secondary" onClick={onJumpToBoard}>Open board</Button>
            <Button type="button" variant="secondary" onClick={onOpenMissingGps}>Missing GPS</Button>
            {canCreate ? <Button type="button" onClick={onUpload}>Upload photo</Button> : null}
          </div>
        </div>
        <div className="co-proof-engine-board co-proof-engine-board--uploads">
          <div className="co-proof-engine-queue">
            <div className="co-proof-engine-section-head">
              <span>Evidence review queue</span>
              <strong>{queueRows.length || "Clear"}</strong>
            </div>
            {queueRows.length ? queueRows.map((upload) => {
              const status = uploadStatus(upload);
              const selected = focusUpload?.id === upload.id;
              return (
                <WorkQueueCard
                  key={upload.id}
                  eyebrow={uploadEvidenceDateKey(upload) === todayDateInputValue() ? "Today" : "Jobsite proof"}
                  title={uploadTitle(upload)}
                  meta={`${uploadJobLabel(upload)} / ${uploadUploaderLabel(upload)}`}
                  status={status.label}
                  tone={status.tone}
                  actionLabel="Open proof"
                  selected={selected}
                  onClick={() => onOpenUpload(upload)}
                >
                  <div className="co-proof-engine-row-meta">
                    <span>{uploadDateTimeLabel(uploadCapturedAt(upload))}</span>
                    <span>{gpsStatusLabel(upload)}</span>
                    <span>{String(upload.caption || upload.notes || "").trim() ? "Caption ready" : "Needs caption"}</span>
                  </div>
                </WorkQueueCard>
              );
            }) : (
              <div className="co-proof-engine-empty">
                <strong>No visible evidence</strong>
                <span>Upload jobsite photos to start the proof intake queue.</span>
              </div>
            )}
          </div>
          <div className="co-proof-engine-detail">
            <div className="co-proof-engine-section-head">
              <span>Selected proof item</span>
              <strong>{focusUpload ? uploadStatus(focusUpload).label : "Waiting"}</strong>
            </div>
            {focusUpload ? (
              <>
                <div className="co-proof-engine-upload-preview">
                  {String(focusUpload.fileType || "").startsWith("image/") ? (
                    <AuthenticatedUploadPreview upload={focusUpload} token={sessionToken} className="h-full min-h-[11rem] w-full rounded-[0.55rem] object-cover" />
                  ) : (
                    <div className="co-proof-engine-file-preview">
                      <Icon name="document" />
                      <span>{focusUpload.fileName || "Uploaded file"}</span>
                    </div>
                  )}
                </div>
                <div className="co-proof-engine-detail-title">
                  <div className="min-w-0">
                    <h3>{uploadTitle(focusUpload)}</h3>
                    <p>{uploadJobLabel(focusUpload)} / {uploadCustomerLabel(focusUpload)} / {uploadUploaderLabel(focusUpload)}</p>
                  </div>
                  <Badge tone={uploadStatus(focusUpload).tone}>{uploadStatus(focusUpload).label}</Badge>
                </div>
                <div className="co-proof-engine-proof-grid">
                  <span data-state="ready">Captured<strong>{uploadDateTimeLabel(uploadCapturedAt(focusUpload))}</strong></span>
                  <span data-state={focusUpload.hasGps ? "ready" : "needs"}>GPS<strong>{gpsStatusLabel(focusUpload)}</strong></span>
                  <span data-state={String(focusUpload.caption || focusUpload.notes || "").trim() ? "ready" : "needs"}>Caption<strong>{String(focusUpload.caption || focusUpload.notes || "").trim() ? "Ready" : "Needed"}</strong></span>
                  <span data-state="ready">File<strong>{uploadFileSizeLabel(focusUpload.fileSize)}</strong></span>
                </div>
                <p className="co-proof-engine-note">{focusUpload.caption || focusUpload.notes || "No caption has been added yet. Add short jobsite context before closeout review."}</p>
                <div className="co-proof-engine-next">
                  <span>Proof connection</span>
                  <strong>{currentEvidenceJobLabel}</strong>
                  <p>{imageCount} image proof item{imageCount === 1 ? "" : "s"} visible, {currentJobUploadCount} tied to the current job.</p>
                </div>
              </>
            ) : (
              <div className="co-proof-engine-empty">
                <strong>No proof selected</strong>
                <span>Choose an upload, open today, or capture new jobsite evidence.</span>
              </div>
            )}
          </div>
        </div>
      </section>
    </CommandPageFrame>
  );
}


export function UploadDetailPanel({ upload, token, canManage, disabled, onSave, onArchive, compactMobile = false }) {
  const [draft, setDraft] = useState({ caption: "", notes: "" });

  useEffect(() => {
    if (!upload) {
      setDraft({ caption: "", notes: "" });
      return;
    }
    setDraft({
      caption: upload.caption || "",
      notes: upload.notes || "",
    });
  }, [upload]);

  if (!upload) {
    return (
      <>
        <UploadMobileAccordionCard title="Selected upload" summary="Choose an upload to review details">
          <StateCard title="No upload selected" description="Choose a photo from the list to review its job link, timestamps, and location metadata." tone="slate" />
        </UploadMobileAccordionCard>
        <Card className="hidden p-5 md:block">
          <SectionHeader title="Upload details" description="Select an upload to review evidence and metadata." />
          <StateCard title="No upload selected" description="Choose a photo from the list to review its job link, timestamps, and location metadata." tone="slate" />
        </Card>
      </>
    );
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        <Card className="co-mobile-detail-card p-3.5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="break-words text-base font-black text-slate-950">{uploadTitle(upload)}</p>
              <p className="mt-1 break-words text-xs font-bold text-slate-500">{uploadJobLabel(upload)} / {uploadFileSizeLabel(upload.fileSize)}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Badge tone={upload.hasGps ? "green" : "slate"}>{gpsStatusLabel(upload)}</Badge>
              {upload.archivedAt ? <Badge tone="slate">Archived</Badge> : null}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {canManage ? <Button size="sm" onClick={() => onSave(draft)} disabled={disabled}>Save notes</Button> : null}
            {canManage && !upload.archivedAt ? <Button variant="secondary" size="sm" onClick={() => onArchive(upload.id)} disabled={disabled}>Archive</Button> : null}
          </div>
        </Card>
        <UploadMobileAccordionCard title="Photo preview" summary={upload.fileName || "Open evidence preview"}>
          <AuthenticatedUploadPreview upload={upload} token={token} className="h-52 w-full max-w-full rounded-2xl object-cover" />
        </UploadMobileAccordionCard>
        <UploadMobileAccordionCard title="Job / report link" summary={uploadJobLabel(upload)}>
          <div className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            <p><span className="font-black text-slate-950">Job:</span> {uploadJobLabel(upload)}</p>
            <p><span className="font-black text-slate-950">Customer:</span> {uploadCustomerLabel(upload)}</p>
            <p><span className="font-black text-slate-950">Uploader:</span> {uploadUploaderLabel(upload)}</p>
          </div>
        </UploadMobileAccordionCard>
        <UploadMobileAccordionCard title="Caption / notes" summary={[draft.caption, draft.notes].filter(Boolean).length ? "Notes added" : "Add caption or notes"}>
          <InputField label="Caption" value={draft.caption} onChange={(event) => setDraft((current) => ({ ...current, caption: event.target.value }))} disabled={!canManage || disabled} />
          <TextAreaField label="Notes" value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} disabled={!canManage || disabled} />
        </UploadMobileAccordionCard>
        <UploadMobileAccordionCard title="Timestamp / GPS metadata" summary={gpsStatusLabel(upload)}>
          <div className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            <p><span className="font-black text-slate-950">Taken at:</span> {uploadDateTimeLabel(upload.takenAt)}</p>
            <p><span className="font-black text-slate-950">Uploaded at:</span> {uploadDateTimeLabel(upload.uploadedAt)}</p>
            <p><span className="font-black text-slate-950">Location status:</span> {gpsStatusLabel(upload)}</p>
            {upload.hasGps ? (
              <>
                <p><span className="font-black text-slate-950">GPS:</span> {upload.latitude?.toFixed?.(5)}, {upload.longitude?.toFixed?.(5)}</p>
                <p><span className="font-black text-slate-950">Accuracy:</span> {Math.round(upload.locationAccuracy || 0)} m</p>
                <p><span className="font-black text-slate-950">Location captured at:</span> {uploadDateTimeLabel(upload.locationCapturedAt)}</p>
              </>
            ) : (
              <p><span className="font-black text-slate-950">Location:</span> {upload.locationUnavailableReason || "Not requested"}</p>
            )}
          </div>
        </UploadMobileAccordionCard>
        <UploadMobileAccordionCard title="File metadata" summary={uploadFileSizeLabel(upload.fileSize)}>
          <div className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            <p><span className="font-black text-slate-950">File name:</span> {upload.fileName || "Unknown"}</p>
            <p><span className="font-black text-slate-950">File type:</span> {upload.fileType || "Unknown"}</p>
            <p><span className="font-black text-slate-950">File size:</span> {uploadFileSizeLabel(upload.fileSize)}</p>
          </div>
        </UploadMobileAccordionCard>
      </div>

      <Card className="hidden p-5 md:block">
      <SectionHeader
        title={uploadTitle(upload)}
        description={`${uploadJobLabel(upload)} / ${uploadFileSizeLabel(upload.fileSize)}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Badge tone={upload.hasGps ? "green" : "slate"}>{gpsStatusLabel(upload)}</Badge>
            {upload.archivedAt ? <Badge tone="slate">Archived</Badge> : null}
          </div>
        }
      />
      <div className="grid gap-4">
        <AuthenticatedUploadPreview upload={upload} token={token} className="h-52 w-full max-w-full rounded-2xl object-cover sm:h-64" />
        <div className="grid gap-3 md:grid-cols-2">
          <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <p><span className="font-black text-slate-950">Uploaded by:</span> {uploadUploaderLabel(upload)}</p>
            <p className="mt-1"><span className="font-black text-slate-950">Taken at:</span> {uploadDateTimeLabel(upload.takenAt)}</p>
            <p className="mt-1"><span className="font-black text-slate-950">Uploaded at:</span> {uploadDateTimeLabel(upload.uploadedAt)}</p>
            <p className="mt-1"><span className="font-black text-slate-950">File type:</span> {upload.fileType || "Unknown"}</p>
          </div>
          <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <p><span className="font-black text-slate-950">Job:</span> {uploadJobLabel(upload)}</p>
            <p className="mt-1"><span className="font-black text-slate-950">Customer:</span> {uploadCustomerLabel(upload)}</p>
            <p className="mt-1"><span className="font-black text-slate-950">Location status:</span> {gpsStatusLabel(upload)}</p>
            {upload.hasGps ? (
              <>
                <p className="mt-1"><span className="font-black text-slate-950">GPS:</span> {upload.latitude?.toFixed?.(5)}, {upload.longitude?.toFixed?.(5)}</p>
                <p className="mt-1"><span className="font-black text-slate-950">Accuracy:</span> {Math.round(upload.locationAccuracy || 0)} m</p>
                <p className="mt-1"><span className="font-black text-slate-950">Location captured at:</span> {uploadDateTimeLabel(upload.locationCapturedAt)}</p>
              </>
            ) : (
              <p className="mt-1"><span className="font-black text-slate-950">Location:</span> {upload.locationUnavailableReason || "Not requested"}</p>
            )}
          </div>
        </div>
        <InputField label="Caption" value={draft.caption} onChange={(event) => setDraft((current) => ({ ...current, caption: event.target.value }))} disabled={!canManage || disabled} />
        <TextAreaField label="Notes" value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} disabled={!canManage || disabled} />
        <div className="flex flex-wrap gap-2">
          {canManage ? <Button onClick={() => onSave(draft)} disabled={disabled}>Save upload notes</Button> : null}
          {canManage && !upload.archivedAt ? <Button variant="secondary" onClick={() => onArchive(upload.id)} disabled={disabled}>Archive upload</Button> : null}
        </div>
      </div>
      </Card>
    </>
  );
}
