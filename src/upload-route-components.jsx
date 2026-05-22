import { useEffect, useState } from "react";

import { Badge, Button, Card, InputField, SectionHeader, StateCard, TextAreaField } from "./app-shell-components";
import { gpsStatusLabel, uploadCustomerLabel, uploadJobLabel, uploadTitle, uploadUploaderLabel } from "./upload-utils";

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
