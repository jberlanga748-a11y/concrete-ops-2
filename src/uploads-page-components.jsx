import { lazy, useEffect, useMemo, useRef, useState } from "react";

import {
  ApexOfficeCommandShell,
  Badge,
  Button,
  Card,
  FilterBar,
  Icon,
  PageHeader,
  SelectField,
  StateCard,
} from "./app-shell-components";
import { CommandCenterKpiCard, ModuleKpiStrip } from "./command-center-route-components";
import { jobTitle } from "./job-utils";
import {
  buildUploadSupportContext,
  deriveAllowedUploadJobs,
  deriveUploadDraftFromSelection,
  deriveUploadListState,
  filterUploads,
  findSelectedUpload,
  gpsStatusLabel,
  uploadCapturedAt,
  uploadEvidenceDateKey,
  uploadEvidenceJobId,
  uploadJobLabel,
  uploadTitle,
  uploadUploaderLabel,
  validateUploadFile,
} from "./upload-utils";

function lazyRouteComponent(importer, exportName) {
  return lazy(() => importer().then((module) => ({ default: module[exportName] })));
}

const UploadCreateCard = lazyRouteComponent(() => import("./upload-route-components"), "UploadCreateCard");
const UploadDetailPanel = lazyRouteComponent(() => import("./upload-route-components"), "UploadDetailPanel");
const UploadListCard = lazyRouteComponent(() => import("./upload-route-components"), "UploadListCard");
const UploadMobileAccordionCard = lazyRouteComponent(() => import("./upload-route-components"), "UploadMobileAccordionCard");
const UploadMobileFieldGroup = lazyRouteComponent(() => import("./upload-route-components"), "UploadMobileFieldGroup");
const UploadsCommandRailPolished = lazyRouteComponent(() => import("./upload-route-components"), "UploadsCommandRailPolished");
const UploadsFieldOperatorPanel = lazyRouteComponent(() => import("./upload-route-components"), "UploadsFieldOperatorPanel");
const UploadsMobileFocusPanel = lazyRouteComponent(() => import("./upload-route-components"), "UploadsMobileFocusPanel");
const UploadsProofWorkbench = lazyRouteComponent(() => import("./upload-route-components"), "UploadsProofWorkbench");
const UploadsTablePolished = lazyRouteComponent(() => import("./upload-route-components"), "UploadsTablePolished");

const INITIAL_UPLOAD_FORM = {
  jobId: "",
  reportId: "",
  caption: "",
  notes: "",
  fileName: "",
  fileType: "",
  fileSize: 0,
  dataUrl: "",
  takenAt: "",
  latitude: null,
  longitude: null,
  locationAccuracy: null,
  locationCapturedAt: "",
  locationUnavailableReason: "",
};

function formatDateTime(value) {
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

function todayDateInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function toDateTimeInputValue(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const localOffsetMs = parsed.getTimezoneOffset() * 60000;
  return new Date(parsed.getTime() - localOffsetMs).toISOString().slice(0, 16);
}

export function UploadsPagePolished({ user, permissions, uploads, jobs, selectedJob, sessionToken, busy, errorMessage, onCreateUpload, onUpdateUpload, onArchiveUpload, onOpenSupport, assistantUploadReviewSeed = null, onAssistantUploadReviewSeedHandled = () => {} }) {
  const [filter, setFilter] = useState("Active only");
  const [search, setSearch] = useState("");
  const [jobFilter, setJobFilter] = useState("All jobs");
  const [uploaderFilter, setUploaderFilter] = useState("All uploaders");
  const [dateFilter, setDateFilter] = useState("All dates");
  const [gpsFilter, setGpsFilter] = useState("All locations");
  const [selectedUploadId, setSelectedUploadId] = useState("");
  const [draft, setDraft] = useState(INITIAL_UPLOAD_FORM);
  const [fileError, setFileError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showTools, setShowTools] = useState(false);
  const [activeTool, setActiveTool] = useState("upload");
  const [mobileUploadToolsOpen, setMobileUploadToolsOpen] = useState(false);
  const [uploadShellSelectionId, setUploadShellSelectionId] = useState("");
  const [uploadShellMode, setUploadShellMode] = useState("detail");
  const toolsRef = useRef(null);
  const mobileToolsRef = useRef(null);
  const boardRef = useRef(null);
  const isFieldUploadWorkspace = !permissions.uploads.canManageAll;
  const safeUploads = Array.isArray(uploads) ? uploads : [];
  const allowedJobs = useMemo(() => deriveAllowedUploadJobs(jobs), [jobs]);
  const listState = useMemo(() => deriveUploadListState(safeUploads), [safeUploads]);
  const visibleRows = useMemo(() => filterUploads(safeUploads, {
    archived: filter,
    query: search,
    jobId: jobFilter,
    uploaderId: uploaderFilter,
    date: dateFilter,
    gps: gpsFilter,
  }), [dateFilter, filter, gpsFilter, jobFilter, safeUploads, search, uploaderFilter]);
  const selectedUpload = useMemo(() => findSelectedUpload(visibleRows, safeUploads, selectedUploadId), [safeUploads, selectedUploadId, visibleRows]);
  const canCreate = permissions.uploads.canCreate;
  const canManage = permissions.uploads.canManageAll;
  const canOpenUploadSupport = Boolean(permissions?.support?.canView && typeof onOpenSupport === "function");
  const imageCount = visibleRows.filter((upload) => String(upload.fileType || "").startsWith("image/")).length;
  const gpsCount = visibleRows.filter((upload) => Number.isFinite(Number(upload.latitude)) && Number.isFinite(Number(upload.longitude))).length;
  const missingGpsCount = visibleRows.filter((upload) => !upload.hasGps).length;
  const missingNotesCount = visibleRows.filter((upload) => !String(upload.caption || upload.notes || "").trim()).length;
  const archivedCount = visibleRows.filter((upload) => upload.archivedAt).length;
  const todayKey = todayDateInputValue();
  const activeUploads = safeUploads.filter((upload) => !upload.archivedAt);
  const preferredJobId = selectedJob?.id && allowedJobs.some((job) => job.id === selectedJob.id)
    ? selectedJob.id
    : draft.jobId && allowedJobs.some((job) => job.id === draft.jobId)
      ? draft.jobId
      : uploadEvidenceJobId(selectedUpload) || allowedJobs[0]?.id || "";
  const currentEvidenceJob = allowedJobs.find((job) => job.id === preferredJobId) || null;
  const currentEvidenceJobLabel = currentEvidenceJob ? jobTitle(currentEvidenceJob) : "Current job";
  const todayUploadCount = activeUploads.filter((upload) => uploadEvidenceDateKey(upload) === todayKey).length;
  const currentJobUploadCount = preferredJobId
    ? activeUploads.filter((upload) => uploadEvidenceJobId(upload) === preferredJobId).length
    : 0;
  const latestVisibleUpload = visibleRows.reduce((latestUpload, upload) => {
    const currentTime = new Date(uploadCapturedAt(upload) || 0).getTime() || 0;
    const latestTime = new Date(uploadCapturedAt(latestUpload) || 0).getTime() || 0;
    return currentTime > latestTime ? upload : latestUpload;
  }, visibleRows[0] || null);
  const uploadKpis = [
    { label: "Evidence", value: visibleRows.length, helper: "Matching current filters", icon: "upload", tone: "orange", actionLabel: "View active", onAction: () => setFilter("Active only") },
    { label: "Photos", value: imageCount, helper: "Image evidence in view", icon: "document", tone: "orange" },
    { label: "GPS Captured", value: gpsCount, helper: "Location metadata present", icon: "check", tone: gpsCount ? "green" : "slate", actionLabel: "View GPS", onAction: () => setGpsFilter("Has GPS") },
    { label: "Missing GPS", value: missingGpsCount, helper: "Still valid if denied", icon: "alert", tone: missingGpsCount ? "amber" : "slate", actionLabel: "Review missing", onAction: () => setGpsFilter("Missing GPS") },
    { label: "Archived", value: archivedCount, helper: "Archived in this view", icon: "box", tone: archivedCount ? "slate" : "green", actionLabel: "View archive", onAction: () => setFilter("Archived only") },
  ];
  const toolTabs = [
    { id: "upload", label: "Upload Photo", count: canCreate ? 1 : 0 },
    { id: "details", label: "Details / Notes", count: selectedUpload ? 1 : 0 },
  ];

  useEffect(() => {
    const preferredJobId = selectedJob?.id && allowedJobs.some((job) => job.id === selectedJob.id)
      ? selectedJob.id
      : allowedJobs[0]?.id || "";
    setDraft((current) => {
      if (current.jobId && allowedJobs.some((job) => job.id === current.jobId)) return current;
      return {
        ...current,
        jobId: preferredJobId,
      };
    });
  }, [allowedJobs, selectedJob?.id]);

  useEffect(() => {
    const fallbackUploadId = visibleRows[0]?.id || "";
    if (!selectedUploadId || !safeUploads.some((upload) => upload?.id === selectedUploadId)) {
      setSelectedUploadId(fallbackUploadId);
    }
  }, [safeUploads, selectedUploadId, visibleRows]);

  async function handleFileChange(event) {
    event.preventDefault();
    event.stopPropagation();
    const file = event.target.files?.[0] || null;
    event.target.value = "";
    const nextError = validateUploadFile(file);
    setFileError(nextError);
    setSuccessMessage("");
    if (nextError || !file) {
      setDraft((current) => ({
        ...current,
        fileName: "",
        fileType: "",
        fileSize: 0,
        dataUrl: "",
      }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setDraft((current) => {
        const nextDraft = deriveUploadDraftFromSelection(current, file, reader.result, new Date());
        return {
          ...nextDraft,
          takenAt: toDateTimeInputValue(nextDraft.takenAtIso),
        };
      });
    };
    reader.readAsDataURL(file);
  }

  function handleRequestLocation() {
    setSuccessMessage("");
    if (!navigator.geolocation) {
      setDraft((current) => ({
        ...current,
        latitude: null,
        longitude: null,
        locationAccuracy: null,
        locationCapturedAt: "",
        locationUnavailableReason: "Location services are unavailable in this browser.",
      }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDraft((current) => ({
          ...current,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          locationAccuracy: position.coords.accuracy,
          locationCapturedAt: new Date(position.timestamp).toISOString(),
          locationUnavailableReason: "",
        }));
      },
      (error) => {
        const reason = error.code === error.PERMISSION_DENIED
          ? "Location permission denied by user."
          : error.code === error.TIMEOUT
            ? "Location request timed out."
            : "Location unavailable on this device.";
        setDraft((current) => ({
          ...current,
          latitude: null,
          longitude: null,
          locationAccuracy: null,
          locationCapturedAt: "",
          locationUnavailableReason: reason,
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFileError("");
    setSuccessMessage("");
    const nextError = validateUploadFile({ type: draft.fileType, size: draft.fileSize });
    if (nextError || !draft.dataUrl) {
      setFileError(nextError || "Choose a photo to upload.");
      return;
    }

    const success = await onCreateUpload({
      jobId: draft.jobId,
      caption: draft.caption,
      notes: draft.notes,
      fileName: draft.fileName,
      fileType: draft.fileType,
      dataUrl: draft.dataUrl,
      takenAt: draft.takenAt ? new Date(draft.takenAt).toISOString() : "",
      latitude: draft.latitude,
      longitude: draft.longitude,
      locationAccuracy: draft.locationAccuracy,
      locationCapturedAt: draft.locationCapturedAt,
      locationUnavailableReason: draft.locationUnavailableReason,
    });

    if (success) {
      setSuccessMessage("Photo evidence uploaded.");
      setDraft({
        ...INITIAL_UPLOAD_FORM,
        jobId: allowedJobs.some((job) => job.id === draft.jobId) ? draft.jobId : (allowedJobs[0]?.id || ""),
      });
      setFileError("");
    }
  }

  async function handleSaveUpload(nextDraft) {
    if (!selectedUpload) return;
    setSuccessMessage("");
    await onUpdateUpload(selectedUpload.id, nextDraft);
  }

  async function handleArchiveSelected(uploadId) {
    setSuccessMessage("");
    await onArchiveUpload(uploadId);
  }

  function isFieldUploadPhone() {
    return isFieldUploadWorkspace && typeof window !== "undefined" && window.innerWidth < 768;
  }

  function scrollUploadToolsIntoView() {
    window.setTimeout(() => {
      const target = isFieldUploadPhone() ? mobileToolsRef.current : toolsRef.current;
      target?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    }, 0);
  }

  function openTool(toolId = "details") {
    setActiveTool(toolId);
    setUploadShellMode(toolId === "upload" ? "upload" : "detail");
    if (toolId === "upload") setUploadShellSelectionId("create-upload");
    setShowTools(true);
    if (isFieldUploadPhone()) setMobileUploadToolsOpen(true);
    scrollUploadToolsIntoView();
  }

  function selectTool(toolId = "details") {
    setActiveTool(toolId);
    if (isFieldUploadPhone()) setMobileUploadToolsOpen(true);
    scrollUploadToolsIntoView();
  }

  function jumpToBoard() {
    window.setTimeout(() => boardRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" }), 0);
  }

  function openTodayUploads() {
    setFilter("Active only");
    setSearch("");
    setJobFilter("All jobs");
    setUploaderFilter("All uploaders");
    setDateFilter(todayKey);
    setGpsFilter("All locations");
    jumpToBoard();
  }

  function openCurrentJobUploads() {
    setFilter("Active only");
    setSearch("");
    if (preferredJobId) setJobFilter(preferredJobId);
    setUploaderFilter("All uploaders");
    setDateFilter("All dates");
    setGpsFilter("All locations");
    jumpToBoard();
  }

  function openPriorityUpload(matchUpload, options = {}) {
    const targetUpload = visibleRows.find(matchUpload) || safeUploads.find(matchUpload);
    if (options.filter) setFilter(options.filter);
    if (options.gpsFilter) setGpsFilter(options.gpsFilter);
    if (options.jobFilter) setJobFilter(options.jobFilter);
    if (targetUpload?.id) setSelectedUploadId(targetUpload.id);
    openTool(options.tool || "details");
  }

  useEffect(() => {
    const seed = assistantUploadReviewSeed;
    if (!seed?.nonce || !permissions.uploads.canManageAll) return;

    const targetUpload = seed.uploadId
      ? safeUploads.find((upload) => upload?.id === seed.uploadId)
      : safeUploads.find((upload) => !upload?.archivedAt && (!upload.hasGps || !String(upload.caption || upload.notes || "").trim()))
        || latestVisibleUpload
        || safeUploads.find((upload) => !upload?.archivedAt)
        || null;

    setFilter(targetUpload?.archivedAt ? "All uploads" : "Active only");
    setSearch("");
    setJobFilter(targetUpload?.jobId || "All jobs");
    setUploaderFilter("All uploaders");
    setDateFilter("All dates");
    const targetHasGps = targetUpload?.hasGps === true || (targetUpload?.latitude != null && targetUpload?.longitude != null);
    setGpsFilter(targetUpload && !targetHasGps ? "Missing GPS" : "All locations");
    if (targetUpload?.id) setSelectedUploadId(targetUpload.id);
    openTool("details");
    onAssistantUploadReviewSeedHandled(seed.nonce);
  }, [assistantUploadReviewSeed?.nonce, permissions.uploads.canManageAll, safeUploads, latestVisibleUpload, onAssistantUploadReviewSeedHandled]);

  function clearFilters() {
    setFilter("Active only");
    setSearch("");
    setJobFilter("All jobs");
    setUploaderFilter("All uploaders");
    setDateFilter("All dates");
    setGpsFilter("All locations");
  }

  function requestUploadSupportReview() {
    if (!canOpenUploadSupport) return;
    onOpenSupport(buildUploadSupportContext({
      user,
      permissions,
      visibleRows,
      selectedUpload,
      filters: {
        archived: filter,
        query: search,
        jobId: jobFilter,
        uploaderId: uploaderFilter,
        date: dateFilter,
        gps: gpsFilter,
      },
      allowedJobs,
    }));
  }

  const missingGpsPriorityCard = {
    label: "Review missing GPS",
    value: missingGpsCount,
    helper: missingGpsCount ? "Evidence without location metadata needs a quick look." : "Visible uploads have GPS context or no gaps.",
    icon: "alert",
    tone: missingGpsCount ? "amber" : "green",
    actionLabel: missingGpsCount ? "Open missing" : "View evidence",
    onAction: () => openPriorityUpload((upload) => !upload.hasGps, { gpsFilter: missingGpsCount ? "Missing GPS" : "All locations" }),
  };
  const captionsPriorityCard = {
    label: "Add captions",
    value: missingNotesCount,
    helper: missingNotesCount ? "Photos are stronger with a caption or office note." : "Visible evidence has caption context.",
    icon: "document",
    tone: missingNotesCount ? "orange" : "green",
    actionLabel: missingNotesCount ? "Open gaps" : "All set",
    onAction: () => openPriorityUpload((upload) => !String(upload.caption || upload.notes || "").trim(), { gpsFilter: "All locations" }),
  };
  const latestPriorityCard = {
    label: "Latest evidence",
    value: latestVisibleUpload ? 1 : 0,
    helper: latestVisibleUpload ? `${uploadJobLabel(latestVisibleUpload)} / ${uploadUploaderLabel(latestVisibleUpload)}` : "No visible upload selected yet.",
    icon: "arrowUpRight",
    tone: latestVisibleUpload ? "orange" : "slate",
    actionLabel: latestVisibleUpload ? "Open latest" : "No evidence",
    onAction: () => openPriorityUpload((upload) => upload.id === latestVisibleUpload?.id, { gpsFilter: "All locations" }),
  };
  const uploadPhotoPriorityCard = {
    label: "Upload photo",
    value: canCreate ? 1 : 0,
    helper: canCreate ? "Capture job-linked photo evidence with optional GPS." : "Upload access is not enabled for this role.",
    icon: "upload",
    tone: canCreate ? "orange" : "slate",
    actionLabel: canCreate ? "Start upload" : "Read only",
    onAction: () => openTool(canCreate ? "upload" : "details"),
  };
  const uploadPriorityCards = isFieldUploadWorkspace
    ? [uploadPhotoPriorityCard, missingGpsPriorityCard, captionsPriorityCard, latestPriorityCard]
    : visibleRows.length === 0 && canCreate
    ? [uploadPhotoPriorityCard, missingGpsPriorityCard, captionsPriorityCard, latestPriorityCard]
    : [missingGpsPriorityCard, captionsPriorityCard, latestPriorityCard, uploadPhotoPriorityCard];
  const evidenceCommandItems = [
    {
      label: "Today",
      value: todayUploadCount,
      helper: todayUploadCount ? "Uploads captured today" : "No uploads captured today",
      tone: todayUploadCount ? "orange" : "slate",
      action: "Open today",
      onClick: openTodayUploads,
    },
    {
      label: "Missing GPS",
      value: missingGpsCount,
      helper: missingGpsCount ? "Review denied or missing location context" : "GPS context is clear",
      tone: missingGpsCount ? "amber" : "green",
      action: missingGpsCount ? "Review GPS" : "Clear",
      onClick: () => openPriorityUpload((upload) => !upload.hasGps, { gpsFilter: missingGpsCount ? "Missing GPS" : "All locations" }),
    },
    {
      label: "Caption gaps",
      value: missingNotesCount,
      helper: missingNotesCount ? "Photos need caption or office note context" : "Caption context is ready",
      tone: missingNotesCount ? "orange" : "green",
      action: missingNotesCount ? "Open gaps" : "Clear",
      onClick: () => openPriorityUpload((upload) => !String(upload.caption || upload.notes || "").trim(), { gpsFilter: "All locations" }),
    },
    {
      label: "Current job",
      value: currentJobUploadCount,
      helper: currentEvidenceJobLabel,
      tone: currentJobUploadCount ? "green" : "slate",
      action: "Open job",
      onClick: openCurrentJobUploads,
    },
  ];
  const evidenceNextAction = missingGpsCount
    ? "Review missing GPS context"
    : missingNotesCount
      ? "Add caption context"
      : latestVisibleUpload
        ? "Review latest field proof"
        : canCreate
          ? "Capture the first job photo"
          : "Evidence board is clear";
  const evidenceNextDetail = missingGpsCount
    ? `${missingGpsCount} upload${missingGpsCount === 1 ? "" : "s"} need a quick location-context review.`
    : missingNotesCount
      ? `${missingNotesCount} upload${missingNotesCount === 1 ? "" : "s"} would be stronger with caption or note context.`
      : latestVisibleUpload
        ? `${uploadTitle(latestVisibleUpload)} is the newest visible evidence.`
        : canCreate
          ? "Start with a job-linked upload and optional GPS capture."
          : "No visible evidence blockers in the current view.";
  const canUseUploadsCommandShell = Boolean(permissions.uploads.canManageAll && !isFieldUploadWorkspace);
  const readyProofCount = visibleRows.filter((upload) => !upload.archivedAt && upload.hasGps && String(upload.caption || upload.notes || "").trim()).length;
  const uploadShellKpis = [
    {
      id: "today",
      label: "Today",
      value: todayUploadCount,
      helper: "Captured today",
      icon: "calendar",
      tone: todayUploadCount ? "orange" : "slate",
      onClick: openTodayUploads,
    },
    {
      id: "current-job",
      label: "Current Job",
      value: currentJobUploadCount,
      helper: currentEvidenceJobLabel,
      icon: "briefcase",
      tone: currentJobUploadCount ? "blue" : "slate",
      onClick: openCurrentJobUploads,
    },
    {
      id: "proof-gaps",
      label: "Proof Gaps",
      value: missingGpsCount + missingNotesCount,
      helper: "GPS or caption context",
      icon: "alert",
      tone: missingGpsCount || missingNotesCount ? "amber" : "green",
      onClick: () => openFirstUploadShellItem((upload) => !upload.hasGps || !String(upload.caption || upload.notes || "").trim(), { gpsFilter: missingGpsCount ? "Missing GPS" : "All locations" }),
    },
    {
      id: "ready-proof",
      label: "Ready Proof",
      value: readyProofCount,
      helper: "GPS and context ready",
      icon: "check",
      tone: readyProofCount ? "green" : "slate",
      onClick: () => openFirstUploadShellItem((upload) => upload.hasGps && String(upload.caption || upload.notes || "").trim(), { gpsFilter: "Has GPS" }),
    },
  ];
  const uploadShellQueue = useMemo(() => {
    const items = [];
    const seenUploadIds = new Set();

    function statusForUpload(upload) {
      if (upload?.archivedAt) return { label: "Archived", tone: "slate" };
      if (!upload?.hasGps) return { label: "GPS gap", tone: "amber" };
      if (!String(upload?.caption || upload?.notes || "").trim()) return { label: "Caption gap", tone: "orange" };
      return { label: "Ready", tone: "green" };
    }

    function addUpload(upload, kind, priority) {
      if (!upload?.id || seenUploadIds.has(upload.id)) return;
      seenUploadIds.add(upload.id);
      const status = statusForUpload(upload);
      const capturedAt = uploadCapturedAt(upload);
      items.push({
        id: `${kind}-${upload.id}`,
        kind,
        upload,
        uploadId: upload.id,
        priority,
        eyebrow: uploadEvidenceDateKey(upload) === todayKey ? "Today" : kind === "missing-gps" ? "Missing GPS" : kind === "caption-gap" ? "Caption gap" : "Jobsite proof",
        title: uploadTitle(upload),
        meta: `${uploadJobLabel(upload)} / ${uploadUploaderLabel(upload)}`,
        statusLabel: status.label,
        tone: status.tone,
        actionLabel: "Review proof",
        badges: [
          { label: gpsStatusLabel(upload), tone: upload.hasGps ? "green" : "amber" },
          { label: String(upload.caption || upload.notes || "").trim() ? "Caption ready" : "Needs caption", tone: String(upload.caption || upload.notes || "").trim() ? "green" : "orange" },
          { label: formatDateTime(capturedAt), tone: "slate" },
        ],
      });
    }

    visibleRows.filter((upload) => !String(upload.caption || upload.notes || "").trim()).forEach((upload, index) => addUpload(upload, "caption-gap", 10 + index));
    visibleRows.filter((upload) => !upload.hasGps).forEach((upload, index) => addUpload(upload, "missing-gps", 30 + index));
    visibleRows.filter((upload) => uploadEvidenceDateKey(upload) === todayKey).forEach((upload, index) => addUpload(upload, "today", 50 + index));
    if (latestVisibleUpload) addUpload(latestVisibleUpload, "latest", 70);
    visibleRows.forEach((upload, index) => addUpload(upload, "evidence", 90 + index));

    return items.sort((left, right) => left.priority - right.priority).slice(0, 7);
  }, [latestVisibleUpload, todayKey, visibleRows]);
  const createUploadShellItem = {
    id: "create-upload",
    kind: "create",
    title: "Upload photo evidence",
    meta: currentEvidenceJobLabel,
    statusLabel: "New",
    tone: "orange",
  };
  const uploadShellFallbackItem = uploadShellQueue.find((item) => item.uploadId && item.uploadId === selectedUpload?.id) || uploadShellQueue[0] || null;
  const selectedUploadShellItem = uploadShellMode === "upload" && uploadShellSelectionId === createUploadShellItem.id
    ? createUploadShellItem
    : uploadShellQueue.find((item) => item.id === uploadShellSelectionId) || uploadShellFallbackItem;
  const uploadShellSelectedId = selectedUploadShellItem?.id || "";
  const uploadShellAssistantDescription = missingGpsCount
    ? `${missingGpsCount} upload${missingGpsCount === 1 ? "" : "s"} need location-context review before closeout.`
    : missingNotesCount
      ? `${missingNotesCount} upload${missingNotesCount === 1 ? "" : "s"} need caption or office note context.`
      : todayUploadCount
        ? `${todayUploadCount} upload${todayUploadCount === 1 ? "" : "s"} captured today and ready for review.`
        : "Photo evidence is clear in the current view.";

  useEffect(() => {
    if (!canUseUploadsCommandShell) return;
    const fallbackId = uploadShellFallbackItem?.id || "";
    if (!uploadShellSelectionId && fallbackId) {
      setUploadShellSelectionId(fallbackId);
      setUploadShellMode("detail");
      return;
    }
    if (uploadShellSelectionId && uploadShellMode !== "upload" && !uploadShellQueue.some((item) => item.id === uploadShellSelectionId)) {
      setUploadShellSelectionId(fallbackId);
    }
  }, [canUseUploadsCommandShell, uploadShellFallbackItem?.id, uploadShellMode, uploadShellQueue, uploadShellSelectionId]);

  function selectUploadShellItem(item) {
    if (!item) return;
    setUploadShellSelectionId(item.id);
    if (item.kind === "create") {
      setUploadShellMode("upload");
      setActiveTool("upload");
      return;
    }
    setUploadShellMode("detail");
    setActiveTool("details");
    if (item.upload?.id) setSelectedUploadId(item.upload.id);
  }

  function startUploadInShell() {
    if (!canCreate) return;
    setUploadShellSelectionId(createUploadShellItem.id);
    setUploadShellMode("upload");
    setActiveTool("upload");
  }

  function openFirstUploadShellItem(matchUpload, options = {}) {
    const targetUpload = visibleRows.find(matchUpload) || safeUploads.find(matchUpload);
    if (options.filter) setFilter(options.filter);
    if (options.gpsFilter) setGpsFilter(options.gpsFilter);
    if (options.jobFilter) setJobFilter(options.jobFilter);
    setUploadShellMode("detail");
    setActiveTool("details");
    if (targetUpload?.id) {
      setSelectedUploadId(targetUpload.id);
      const matchingItem = uploadShellQueue.find((item) => item.uploadId === targetUpload.id);
      setUploadShellSelectionId(matchingItem?.id || `evidence-${targetUpload.id}`);
    }
  }

  function renderUploadShellDetail(item) {
    const isCreateMode = item?.kind === "create" || uploadShellMode === "upload";
    if (isCreateMode) {
      return (
        <div className="co-uploads-shell-detail-scroll">
          {successMessage ? <div className="mb-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">{successMessage}</div> : null}
          <UploadCreateCard
            canCreate={canCreate}
            jobs={allowedJobs}
            draft={draft}
            setDraft={setDraft}
            onRequestLocation={handleRequestLocation}
            onFileChange={handleFileChange}
            onSubmit={handleSubmit}
            loading={busy}
            fileError={fileError}
          />
        </div>
      );
    }

    const detailUpload = item?.upload?.id === selectedUpload?.id ? selectedUpload : (item?.upload || selectedUpload);
    return (
      <div className="co-uploads-shell-detail-scroll">
        {successMessage ? <div className="mb-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">{successMessage}</div> : null}
        <UploadDetailPanel
          upload={detailUpload}
          token={sessionToken}
          canManage={canManage}
          disabled={busy}
          onSave={(nextDraft) => detailUpload?.id ? onUpdateUpload(detailUpload.id, nextDraft) : handleSaveUpload(nextDraft)}
          onArchive={(uploadId) => handleArchiveSelected(uploadId || detailUpload?.id)}
        />
      </div>
    );
  }
  const uploadsEmptyTitle = safeUploads.length === 0 ? "No uploads yet" : "No uploads match these filters";
  const uploadsEmptyDescription = safeUploads.length === 0
    ? "Photo evidence will appear here after the first field upload."
    : "Clear filters or adjust the search to bring existing photo evidence back into view.";
  const fieldTabletUploadRows = visibleRows.slice(0, 5);
  const selectedFieldTabletUpload = selectedUpload || fieldTabletUploadRows[0] || null;
  const fieldTabletUploadKpis = [
    { label: "Today", value: todayUploadCount, helper: "Captured today", tone: todayUploadCount ? "orange" : "slate" },
    { label: "Current Job", value: currentJobUploadCount, helper: currentEvidenceJobLabel, tone: currentJobUploadCount ? "green" : "slate" },
    { label: "GPS Gaps", value: missingGpsCount, helper: "Location context", tone: missingGpsCount ? "amber" : "green" },
    { label: "Caption Gaps", value: missingNotesCount, helper: "Photo context", tone: missingNotesCount ? "orange" : "green" },
  ];

  if (canUseUploadsCommandShell) {
    return (
      <div className="co-office-page co-uploads-page co-uploads-shell-page">
        <ApexOfficeCommandShell
          eyebrow="Field Ops"
          title="Photo Evidence"
          description="Proof command for today's jobsite uploads, current-job evidence, GPS gaps, and closeout-ready photo context."
          kpis={uploadShellKpis}
          queue={{
            title: "Upload proof queue",
            description: `${uploadShellQueue.length} priority proof item${uploadShellQueue.length === 1 ? "" : "s"} shown from the current evidence view.`,
            items: uploadShellQueue,
            selectedId: uploadShellSelectedId,
            onSelect: selectUploadShellItem,
            emptyState: <StateCard title="Upload queue clear" description="GPS gaps, caption gaps, today's uploads, and recent proof appear here when they need review." tone="green" />,
          }}
          detail={{
            title: selectedUploadShellItem?.kind === "create" ? "Upload photo" : "Selected evidence",
            item: selectedUploadShellItem,
            render: renderUploadShellDetail,
            emptyState: <StateCard title="No upload selected" description="Select an upload proof item or start a new photo upload." tone="slate" />,
          }}
          assistant={{
            title: "Photo Evidence",
            description: uploadShellAssistantDescription,
            priorities: [
              { label: "Today", value: todayUploadCount, tone: todayUploadCount ? "orange" : "slate" },
              { label: "Current job", value: currentJobUploadCount, tone: currentJobUploadCount ? "blue" : "slate" },
              { label: "Proof gaps", value: missingGpsCount + missingNotesCount, tone: missingGpsCount || missingNotesCount ? "amber" : "green" },
              { label: "Ready proof", value: readyProofCount, tone: readyProofCount ? "green" : "slate" },
            ],
            actions: [
              canCreate ? { label: "Upload photo", icon: "upload", onClick: startUploadInShell } : null,
              { label: "Review gaps", icon: "alert", onClick: () => openFirstUploadShellItem((upload) => !upload.hasGps || !String(upload.caption || upload.notes || "").trim(), { gpsFilter: missingGpsCount ? "Missing GPS" : "All locations" }), disabled: !missingGpsCount && !missingNotesCount },
              { label: "Open today", icon: "calendar", onClick: openTodayUploads, disabled: !todayUploadCount },
            ].filter(Boolean),
            guardrails: [
              "Manual proof review only",
              "No automatic external sends",
              "Role and company scope unchanged",
            ],
          }}
          quickActions={[
            canCreate ? { id: "upload-photo", label: "Upload Photo", icon: "upload", onClick: startUploadInShell } : null,
            { id: "today", label: "Today", icon: "calendar", onClick: openTodayUploads },
            { id: "proof-gaps", label: "Proof Gaps", icon: "alert", onClick: () => openFirstUploadShellItem((upload) => !upload.hasGps || !String(upload.caption || upload.notes || "").trim(), { gpsFilter: missingGpsCount ? "Missing GPS" : "All locations" }) },
          ].filter(Boolean)}
          className="co-uploads-command-shell"
        />
      </div>
    );
  }

  return (
    <div className="co-office-page co-uploads-page" data-field-workspace={isFieldUploadWorkspace ? "true" : undefined}>
      <PageHeader
        eyebrow={permissions.uploads.canManageAll ? "Field Ops" : "Field Workspace"}
        title="Photo Evidence"
        description="Job-linked photo evidence with timestamp metadata, optional GPS capture, and field-safe upload workflows."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => setFilter("Active only")}>{visibleRows.length} visible</Button>
            {canOpenUploadSupport ? (
              <Button type="button" size="sm" variant="secondary" onClick={requestUploadSupportReview}>
                <Icon name="help" />Photo Support
              </Button>
            ) : null}
            {canCreate ? <Button type="button" onClick={() => openTool("upload")}>Upload Photo</Button> : null}
          </div>
        }
      />

      {isFieldUploadWorkspace ? (
        <section className="co-field-tablet-command co-uploads-tablet-command mx-auto w-full max-w-[1520px] min-w-0 px-4 pb-4 sm:px-5" aria-label="Tablet photo evidence command">
          <div className="co-field-tablet-shell">
            <div className="co-field-tablet-head">
              <div className="min-w-0">
                <p>Tablet proof</p>
                <h2>Photo Evidence</h2>
                <span>Capture job proof, review visible uploads, and keep GPS or caption gaps easy to fix.</span>
              </div>
              <Badge tone={canCreate ? "orange" : "slate"}>{canCreate ? "Upload ready" : "Read-only"}</Badge>
            </div>

            <div className="co-field-tablet-kpis" aria-label="Photo evidence status">
              {fieldTabletUploadKpis.map((item) => (
                <div key={item.label} className="co-field-tablet-kpi" data-tone={item.tone}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  <em>{item.helper}</em>
                </div>
              ))}
            </div>

            <div className="co-field-tablet-grid">
              <section className="co-field-tablet-actions" aria-label="Photo upload actions">
                <div className="co-field-tablet-section-head">
                  <div>
                    <strong>Upload photo</strong>
                    <span>{currentEvidenceJobLabel}</span>
                  </div>
                  <Badge tone="slate">{allowedJobs.length} job{allowedJobs.length === 1 ? "" : "s"}</Badge>
                </div>
                <div className="co-field-tablet-scroll">
                  {successMessage ? <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">{successMessage}</div> : null}
                  <UploadCreateCard
                    canCreate={canCreate}
                    jobs={allowedJobs}
                    draft={draft}
                    setDraft={setDraft}
                    onRequestLocation={handleRequestLocation}
                    onFileChange={handleFileChange}
                    onSubmit={handleSubmit}
                    loading={busy}
                    fileError={fileError}
                  />
                </div>
              </section>

              <section className="co-field-tablet-queue" aria-label="Visible photo evidence queue">
                <div className="co-field-tablet-section-head">
                  <div>
                    <strong>Proof queue</strong>
                    <span>{fieldTabletUploadRows.length} of {visibleRows.length} visible uploads</span>
                  </div>
                  <Badge tone={missingGpsCount || missingNotesCount ? "amber" : "green"}>{missingGpsCount + missingNotesCount} gaps</Badge>
                </div>
                <div className="co-field-tablet-list">
                  {fieldTabletUploadRows.length === 0 ? (
                    <StateCard title="No visible uploads" description={canCreate ? "Use the upload card to capture the first job photo." : "Visible job proof appears here when uploaded."} tone="slate" />
                  ) : fieldTabletUploadRows.map((upload) => (
                    <button
                      key={upload.id}
                      type="button"
                      className={`co-field-tablet-row co-focus-ring ${selectedFieldTabletUpload?.id === upload.id ? "is-selected" : ""}`}
                      onClick={() => setSelectedUploadId(upload.id)}
                    >
                      <span>
                        <strong>{uploadTitle(upload)}</strong>
                        <em>{uploadJobLabel(upload)} / {uploadUploaderLabel(upload)}</em>
                      </span>
                      <span>
                        <Badge tone={upload.hasGps ? "green" : "amber"}>{gpsStatusLabel(upload)}</Badge>
                        <b>{uploadEvidenceDateKey(upload) || "No date"}</b>
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="co-field-tablet-selected" aria-label="Selected photo evidence">
                <div className="co-field-tablet-section-head">
                  <div>
                    <strong>Selected proof</strong>
                    <span>{selectedFieldTabletUpload ? uploadTitle(selectedFieldTabletUpload) : "Nothing selected"}</span>
                  </div>
                </div>
                <div className="co-field-tablet-detail-scroll">
                  {selectedFieldTabletUpload ? (
                    <div className="co-field-tablet-proof-detail">
                      <div className="co-field-tablet-proof-title">
                        <span>
                          <strong>{uploadTitle(selectedFieldTabletUpload)}</strong>
                          <em>{uploadJobLabel(selectedFieldTabletUpload)} / {uploadUploaderLabel(selectedFieldTabletUpload)}</em>
                        </span>
                        <Badge tone={selectedFieldTabletUpload.hasGps ? "green" : "amber"}>{gpsStatusLabel(selectedFieldTabletUpload)}</Badge>
                      </div>
                      <div className="co-field-tablet-proof-meta">
                        <span><b>Captured</b>{uploadCapturedAt(selectedFieldTabletUpload) ? new Date(uploadCapturedAt(selectedFieldTabletUpload)).toLocaleString() : "Not recorded"}</span>
                        <span><b>Job</b>{uploadJobLabel(selectedFieldTabletUpload)}</span>
                        <span><b>Uploader</b>{uploadUploaderLabel(selectedFieldTabletUpload)}</span>
                        <span><b>GPS</b>{gpsStatusLabel(selectedFieldTabletUpload)}</span>
                      </div>
                      <div className="co-field-tablet-proof-notes">
                        <strong>Caption</strong>
                        <p>{selectedFieldTabletUpload.caption || "No caption recorded."}</p>
                        <strong>Notes</strong>
                        <p>{selectedFieldTabletUpload.notes || "No field notes recorded."}</p>
                      </div>
                    </div>
                  ) : (
                    <StateCard title="No proof selected" description="Choose a photo evidence card to review field-safe metadata." tone="slate" />
                  )}
                </div>
              </section>

              <section className="co-field-tablet-summary" aria-label="Photo evidence guardrails">
                <strong>{evidenceNextAction}</strong>
                <span>{evidenceNextDetail}</span>
                <em>Field tablet view: job proof only, no leads, estimates, pricing, private source URLs, or admin controls.</em>
              </section>
            </div>
          </div>
        </section>
      ) : null}

      {permissions.uploads.canManageAll ? (
        <UploadsProofWorkbench
          visibleRows={visibleRows}
          selectedUpload={selectedUpload}
          latestVisibleUpload={latestVisibleUpload}
          sessionToken={sessionToken}
          evidenceCommandItems={evidenceCommandItems}
          evidenceNextAction={evidenceNextAction}
          evidenceNextDetail={evidenceNextDetail}
          visibleCount={visibleRows.length}
          todayUploadCount={todayUploadCount}
          currentJobUploadCount={currentJobUploadCount}
          currentEvidenceJobLabel={currentEvidenceJobLabel}
          gpsCount={gpsCount}
          missingGpsCount={missingGpsCount}
          missingNotesCount={missingNotesCount}
          imageCount={imageCount}
          canCreate={canCreate}
          onUpload={() => openTool("upload")}
          onJumpToBoard={jumpToBoard}
          onOpenToday={openTodayUploads}
          onOpenCurrentJob={openCurrentJobUploads}
          onOpenMissingGps={() => openPriorityUpload((upload) => !upload.hasGps, { gpsFilter: missingGpsCount ? "Missing GPS" : "All locations" })}
          onOpenCaptionGap={() => openPriorityUpload((upload) => !String(upload.caption || upload.notes || "").trim(), { gpsFilter: "All locations" })}
          onOpenUpload={(upload) => {
            setSelectedUploadId(upload.id);
            openTool("details");
          }}
          onSetActive={() => setFilter("Active only")}
          onSetGps={setGpsFilter}
        />
      ) : null}

      {permissions.uploads.canManageAll ? (
        <UploadsMobileFocusPanel
          upload={selectedUpload}
          latestUpload={latestVisibleUpload}
          visibleCount={visibleRows.length}
          todayCount={todayUploadCount}
          currentJobUploadCount={currentJobUploadCount}
          currentJobLabel={currentEvidenceJobLabel}
          gpsCount={gpsCount}
          missingGpsCount={missingGpsCount}
          missingNotesCount={missingNotesCount}
          canCreate={canCreate}
          onUpload={() => openTool("upload")}
          onOpenToday={openTodayUploads}
          onOpenCurrentJob={openCurrentJobUploads}
          onOpenMissingGps={() => openPriorityUpload((upload) => !upload.hasGps, { gpsFilter: missingGpsCount ? "Missing GPS" : "All locations" })}
          onOpenCaptionGap={() => openPriorityUpload((upload) => !String(upload.caption || upload.notes || "").trim(), { gpsFilter: "All locations" })}
          onOpenLatest={() => openPriorityUpload((upload) => upload.id === latestVisibleUpload?.id, { gpsFilter: "All locations" })}
          onJumpToBoard={jumpToBoard}
        />
      ) : null}

      {!permissions.uploads.canManageAll ? (
        <UploadsFieldOperatorPanel
          upload={selectedUpload}
          visibleRows={visibleRows}
          allowedJobs={allowedJobs}
          todayCount={todayUploadCount}
          currentJobUploadCount={currentJobUploadCount}
          currentJobLabel={currentEvidenceJobLabel}
          missingGpsCount={missingGpsCount}
          missingNotesCount={missingNotesCount}
          canCreate={canCreate}
          onOpenTool={openTool}
          onJumpToBoard={jumpToBoard}
        />
      ) : null}

      <div className="co-uploads-kpi-grid mx-auto grid w-full max-w-[1520px] min-w-0 grid-cols-1 gap-3 px-5 pb-3 sm:px-6 md:grid-cols-5 lg:px-6">
        {uploadKpis.map((item) => <CommandCenterKpiCard key={item.label} item={item} />)}
      </div>

      <div className="co-uploads-priority-grid mx-auto grid w-full max-w-[1520px] min-w-0 gap-3 px-5 pb-3 sm:px-6 md:grid-cols-2 xl:grid-cols-4 lg:px-6">
        {uploadPriorityCards.map((card) => (
          <button key={card.label} type="button" className="co-uploads-priority-card co-focus-ring" data-tone={card.tone} data-primary={card === uploadPhotoPriorityCard && canCreate ? "true" : undefined} onClick={card.onAction}>
            <span className="co-uploads-priority-icon"><Icon name={card.icon} className="h-4 w-4" /></span>
            <span className="min-w-0">
              <span className="co-uploads-priority-value">{card.value}</span>
              <span className="co-uploads-priority-label">{card.label}</span>
              <span className="co-uploads-priority-helper">{card.helper}</span>
            </span>
            <span className="co-uploads-priority-action">{card.actionLabel} -&gt;</span>
          </button>
        ))}
      </div>

      <div className="co-uploads-command-layout mx-auto grid w-full max-w-[1520px] min-w-0 gap-3 px-5 pb-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-6">
        <div className="co-uploads-left-stack min-w-0 space-y-3">
          <div ref={boardRef}>
            <Card className="co-uploads-main-board overflow-hidden">
              <div className="co-uploads-board-header border-b border-slate-200 bg-white p-4">
                <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <h2 className="text-base font-black uppercase tracking-[0.04em] text-slate-950">Evidence Board</h2>
                    <p className="mt-1 text-sm font-bold leading-5 text-slate-600">Filter photos, select evidence, and keep captions, timestamps, GPS, and job context in one review lane.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="secondary" onClick={() => setFilter("Active only")}>Active</Button>
                    <Button type="button" size="sm" variant="secondary" onClick={() => setGpsFilter("Has GPS")}>GPS</Button>
                    {canCreate ? <Button type="button" size="sm" onClick={() => openTool("upload")}>Upload Photo</Button> : null}
                  </div>
                </div>
              </div>
              <FilterBar filters={["Active only", "Archived only", "All uploads"]} active={filter} setActive={setFilter} search={search} setSearch={setSearch} placeholder="Search job, caption, uploader, notes..." />
              <details className="co-uploads-advanced-filters border-b border-slate-200 bg-white">
                <summary>
                  <span>Advanced filters</span>
                  <span>{[jobFilter !== "All jobs" ? jobFilter : "", uploaderFilter !== "All uploaders" ? uploaderFilter : "", dateFilter !== "All dates" ? dateFilter : "", gpsFilter !== "All locations" ? gpsFilter : ""].filter(Boolean).length || "Job, uploader, GPS"}</span>
                </summary>
                <div className="co-office-filter-grid co-uploads-filter-grid grid gap-3 p-3 md:grid-cols-4">
                  <SelectField label="Job" value={jobFilter} onChange={(event) => setJobFilter(event.target.value)}>
                    <option>All jobs</option>
                    {listState.jobOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </SelectField>
                  <SelectField label="Uploader" value={uploaderFilter} onChange={(event) => setUploaderFilter(event.target.value)}>
                    <option>All uploaders</option>
                    {listState.uploaderOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </SelectField>
                  <SelectField label="Date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>
                    <option>All dates</option>
                    {listState.dateOptions.map((value) => <option key={value} value={value}>{value}</option>)}
                  </SelectField>
                  <SelectField label="GPS" value={gpsFilter} onChange={(event) => setGpsFilter(event.target.value)}>
                    <option>All locations</option>
                    <option>Has GPS</option>
                    <option>Missing GPS</option>
                  </SelectField>
                </div>
              </details>
              {successMessage ? <div className="border-b border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{successMessage}</div> : null}
              {errorMessage && visibleRows.length === 0 ? (
                <div className="p-5"><StateCard title="Photo Evidence unavailable" description={errorMessage} tone="red" /></div>
              ) : visibleRows.length === 0 ? (
                <div className="p-5"><StateCard title={uploadsEmptyTitle} description={uploadsEmptyDescription} tone="slate" /></div>
              ) : (
                <UploadsTablePolished rows={visibleRows} selectedId={selectedUpload?.id} onSelect={setSelectedUploadId} />
              )}
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3">
                <p className="text-sm font-bold text-slate-600">Showing {visibleRows.length} upload{visibleRows.length === 1 ? "" : "s"}</p>
                <Button type="button" size="sm" variant="secondary" onClick={clearFilters}>Clear filters</Button>
              </div>
            </Card>
          </div>
        </div>

        <UploadsCommandRailPolished
          upload={selectedUpload}
          token={sessionToken}
          canCreate={canCreate}
          canManage={canManage}
          disabled={busy}
          onArchive={handleArchiveSelected}
          onOpenTool={openTool}
        />
      </div>

      {!permissions.uploads.canManageAll && mobileUploadToolsOpen ? (
        <div ref={mobileToolsRef} className="co-field-mobile-tool-surface co-uploads-mobile-tool-surface mx-4 mb-24 md:hidden">
          <div className="co-field-mobile-section-head">
            <span>
              <strong>Photo tools</strong>
              <em>Capture proof or update selected evidence without opening a drawer.</em>
            </span>
            <button type="button" className="co-field-mobile-tool-close" onClick={() => setMobileUploadToolsOpen(false)}>Done</button>
          </div>
          <div className="co-field-mobile-tool-tabs" role="tablist" aria-label="Photo evidence tools">
            {toolTabs.map((tab) => (
              <button key={tab.id} type="button" className={activeTool === tab.id ? "is-active" : ""} onClick={() => selectTool(tab.id)}>
                {tab.label}
                <span>{tab.count}</span>
              </button>
            ))}
          </div>
          <div className="co-field-mobile-tool-body">
            {activeTool === "upload" ? (
              <UploadCreateCard
                canCreate={canCreate}
                jobs={allowedJobs}
                draft={draft}
                setDraft={setDraft}
                onRequestLocation={handleRequestLocation}
                onFileChange={handleFileChange}
                onSubmit={handleSubmit}
                loading={busy}
                fileError={fileError}
              />
            ) : null}
            {activeTool === "details" ? (
              <UploadDetailPanel upload={selectedUpload} token={sessionToken} canManage={canManage} disabled={busy} onSave={handleSaveUpload} onArchive={handleArchiveSelected} />
            ) : null}
          </div>
        </div>
      ) : null}

      <details
        ref={toolsRef}
        className="co-uploads-tools-drawer mx-auto w-full max-w-[1520px] min-w-0 px-5 pb-24 sm:px-6 md:pb-4 lg:px-8"
        open={showTools}
        onToggle={(event) => setShowTools(event.currentTarget.open)}
      >
        <summary>
          <span>
            <strong>Evidence Tools</strong>
            <em>Capture photo evidence, request GPS, edit captions, and review selected evidence details below the board.</em>
          </span>
          <span>Open tools</span>
        </summary>
        <div className="co-uploads-tool-tabs mt-3 flex min-w-0 gap-2 overflow-x-auto pb-1">
          {toolTabs.map((tab) => (
            <button key={tab.id} type="button" className={activeTool === tab.id ? "is-active" : ""} onClick={() => selectTool(tab.id)}>
              {tab.label}
              <span>{tab.count}</span>
            </button>
          ))}
        </div>
        <div className="co-uploads-tools-panel mt-3">
          {activeTool === "upload" ? (
            <UploadCreateCard
              canCreate={canCreate}
              jobs={allowedJobs}
              draft={draft}
              setDraft={setDraft}
              onRequestLocation={handleRequestLocation}
              onFileChange={handleFileChange}
              onSubmit={handleSubmit}
              loading={busy}
              fileError={fileError}
            />
          ) : null}
          {activeTool === "details" ? (
            <UploadDetailPanel upload={selectedUpload} token={sessionToken} canManage={canManage} disabled={busy} onSave={handleSaveUpload} onArchive={handleArchiveSelected} />
          ) : null}
        </div>
      </details>
    </div>
  );
}

export function UploadsPage(props) {
  if (!props.permissions?.uploads?.canView) {
    return (
      <div className="co-office-page co-uploads-page">
        <PageHeader eyebrow="Field Tools" title="Photo Evidence" description="This module is not available for this role." />
        <div className="px-5 sm:px-6 lg:px-8">
          <StateCard title="Photo Evidence access unavailable" description="Only office, foreman, or assigned field roles can open job-linked photo evidence." tone="slate" />
        </div>
      </div>
    );
  }

  return <UploadsPagePolished {...props} />;
}

function UploadsPageLegacy({ user, permissions, uploads, jobs, selectedJob, sessionToken, busy, errorMessage, onCreateUpload, onUpdateUpload, onArchiveUpload }) {
  const [filter, setFilter] = useState("Active only");
  const [search, setSearch] = useState("");
  const [jobFilter, setJobFilter] = useState("All jobs");
  const [uploaderFilter, setUploaderFilter] = useState("All uploaders");
  const [dateFilter, setDateFilter] = useState("All dates");
  const [gpsFilter, setGpsFilter] = useState("All locations");
  const [selectedUploadId, setSelectedUploadId] = useState("");
  const [draft, setDraft] = useState(INITIAL_UPLOAD_FORM);
  const [fileError, setFileError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const safeUploads = Array.isArray(uploads) ? uploads : [];
  const allowedJobs = useMemo(() => deriveAllowedUploadJobs(jobs), [jobs]);
  const listState = useMemo(() => deriveUploadListState(safeUploads), [safeUploads]);
  const visibleRows = useMemo(() => filterUploads(safeUploads, {
    archived: filter,
    query: search,
    jobId: jobFilter,
    uploaderId: uploaderFilter,
    date: dateFilter,
    gps: gpsFilter,
  }), [dateFilter, filter, gpsFilter, jobFilter, safeUploads, search, uploaderFilter]);
  const selectedUpload = useMemo(() => findSelectedUpload(visibleRows, safeUploads, selectedUploadId), [safeUploads, selectedUploadId, visibleRows]);
  const latestVisibleUpload = visibleRows[0] || null;
  const uploadListSummary = `${visibleRows.length} uploads${latestVisibleUpload ? ` / Latest ${uploadJobLabel(latestVisibleUpload)}` : ""}`;
  const uploadKpis = [
    { label: "Visible Uploads", value: visibleRows.length, helper: "Current photo/document log", icon: "upload" },
    { label: "Photo Evidence", value: visibleRows.filter((upload) => String(upload.fileType || "").startsWith("image/")).length, helper: "Images in this view", icon: "document" },
    { label: "GPS Captured", value: visibleRows.filter((upload) => Number.isFinite(Number(upload.latitude)) && Number.isFinite(Number(upload.longitude))).length, helper: "Location metadata present", icon: "check" },
    { label: "Needs Link", value: visibleRows.filter((upload) => !upload.jobId && !upload.reportId).length, helper: "Not tied to a job/report", icon: "alert" },
  ];

  useEffect(() => {
    const preferredJobId = selectedJob?.id && allowedJobs.some((job) => job.id === selectedJob.id)
      ? selectedJob.id
      : allowedJobs[0]?.id || "";
    setDraft((current) => {
      if (current.jobId && allowedJobs.some((job) => job.id === current.jobId)) return current;
      return {
        ...current,
        jobId: preferredJobId,
      };
    });
  }, [allowedJobs, selectedJob?.id]);

  useEffect(() => {
    const fallbackUploadId = visibleRows[0]?.id || "";
    if (!selectedUploadId || !safeUploads.some((upload) => upload?.id === selectedUploadId)) {
      setSelectedUploadId(fallbackUploadId);
    }
  }, [safeUploads, selectedUploadId, visibleRows]);

  async function handleFileChange(event) {
    event.preventDefault();
    event.stopPropagation();
    const file = event.target.files?.[0] || null;
    event.target.value = "";
    const nextError = validateUploadFile(file);
    setFileError(nextError);
    setSuccessMessage("");
    if (nextError || !file) {
      setDraft((current) => ({
        ...current,
        fileName: "",
        fileType: "",
        fileSize: 0,
        dataUrl: "",
      }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setDraft((current) => {
        const nextDraft = deriveUploadDraftFromSelection(current, file, reader.result, new Date());
        return {
          ...nextDraft,
          takenAt: toDateTimeInputValue(nextDraft.takenAtIso),
        };
      });
    };
    reader.readAsDataURL(file);
  }

  function handleRequestLocation() {
    setSuccessMessage("");
    if (!navigator.geolocation) {
      setDraft((current) => ({
        ...current,
        latitude: null,
        longitude: null,
        locationAccuracy: null,
        locationCapturedAt: "",
        locationUnavailableReason: "Location services are unavailable in this browser.",
      }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDraft((current) => ({
          ...current,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          locationAccuracy: position.coords.accuracy,
          locationCapturedAt: new Date(position.timestamp).toISOString(),
          locationUnavailableReason: "",
        }));
      },
      (error) => {
        const reason = error.code === error.PERMISSION_DENIED
          ? "Location permission denied by user."
          : error.code === error.TIMEOUT
            ? "Location request timed out."
            : "Location unavailable on this device.";
        setDraft((current) => ({
          ...current,
          latitude: null,
          longitude: null,
          locationAccuracy: null,
          locationCapturedAt: "",
          locationUnavailableReason: reason,
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFileError("");
    setSuccessMessage("");
    const nextError = validateUploadFile({ type: draft.fileType, size: draft.fileSize });
    if (nextError || !draft.dataUrl) {
      setFileError(nextError || "Choose a photo to upload.");
      return;
    }

    const success = await onCreateUpload({
      jobId: draft.jobId,
      caption: draft.caption,
      notes: draft.notes,
      fileName: draft.fileName,
      fileType: draft.fileType,
      dataUrl: draft.dataUrl,
      takenAt: draft.takenAt ? new Date(draft.takenAt).toISOString() : "",
      latitude: draft.latitude,
      longitude: draft.longitude,
      locationAccuracy: draft.locationAccuracy,
      locationCapturedAt: draft.locationCapturedAt,
      locationUnavailableReason: draft.locationUnavailableReason,
    });

    if (success) {
      setSuccessMessage("Photo evidence uploaded.");
      setDraft({
        ...INITIAL_UPLOAD_FORM,
        jobId: allowedJobs.some((job) => job.id === draft.jobId) ? draft.jobId : (allowedJobs[0]?.id || ""),
      });
      setFileError("");
    }
  }

  async function handleSaveUpload(nextDraft) {
    if (!selectedUpload) return;
    setSuccessMessage("");
    await onUpdateUpload(selectedUpload.id, nextDraft);
  }

  async function handleArchiveSelected(uploadId) {
    setSuccessMessage("");
    await onArchiveUpload(uploadId);
  }

  return (
    <div>
      <PageHeader eyebrow={permissions.uploads.canManageAll ? "Field Ops" : "Field Workspace"} title="Uploads" description="Job-linked photo evidence with timestamp metadata and optional GPS capture for field documentation." actions={<Badge tone="blue">{visibleRows.length} uploads</Badge>} />
      <ModuleKpiStrip items={uploadKpis} />
      <div className="grid min-w-0 gap-4 px-5 pb-24 sm:px-6 md:pb-0 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        <div className="min-w-0">
          <UploadMobileAccordionCard title="Upload list" summary={uploadListSummary} badge={<Badge tone="blue">{visibleRows.length}</Badge>}>
            <div className="grid gap-2.5">
              <FilterBar filters={["Active only", "Archived only", "All uploads"]} active={filter} setActive={setFilter} search={search} setSearch={setSearch} placeholder="Search uploads..." />
              <UploadMobileFieldGroup title="Filters" summary="Job, uploader, date, and GPS">
                <SelectField label="Job" value={jobFilter} onChange={(event) => setJobFilter(event.target.value)}>
                  <option>All jobs</option>
                  {listState.jobOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </SelectField>
                <SelectField label="Uploader" value={uploaderFilter} onChange={(event) => setUploaderFilter(event.target.value)}>
                  <option>All uploaders</option>
                  {listState.uploaderOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </SelectField>
                <SelectField label="Date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>
                  <option>All dates</option>
                  {listState.dateOptions.map((value) => <option key={value} value={value}>{value}</option>)}
                </SelectField>
                <SelectField label="GPS" value={gpsFilter} onChange={(event) => setGpsFilter(event.target.value)}>
                  <option>All locations</option>
                  <option>Has GPS</option>
                  <option>Missing GPS</option>
                </SelectField>
              </UploadMobileFieldGroup>
              {successMessage ? <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">{successMessage}</div> : null}
              {errorMessage && visibleRows.length === 0 ? (
                <StateCard title="Uploads unavailable" description={errorMessage} tone="red" />
              ) : visibleRows.length === 0 ? (
                <StateCard title="No uploads yet" description="Photo evidence will appear here after the first field upload." tone="slate" />
              ) : (
                <div className="space-y-2.5">
                  {visibleRows.map((upload) => <UploadListCard key={upload.id} upload={upload} selected={selectedUpload?.id === upload.id} onSelect={setSelectedUploadId} />)}
                </div>
              )}
            </div>
          </UploadMobileAccordionCard>
          <Card className="hidden overflow-hidden md:block">
          <FilterBar filters={["Active only", "Archived only", "All uploads"]} active={filter} setActive={setFilter} search={search} setSearch={setSearch} placeholder="Search job, caption, uploader, notes..." />
          <div className="grid gap-3 border-b border-blue-100 bg-blue-50/40 p-3 md:grid-cols-2 xl:grid-cols-4">
            <SelectField label="Job" value={jobFilter} onChange={(event) => setJobFilter(event.target.value)}>
              <option>All jobs</option>
              {listState.jobOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </SelectField>
            <SelectField label="Uploader" value={uploaderFilter} onChange={(event) => setUploaderFilter(event.target.value)}>
              <option>All uploaders</option>
              {listState.uploaderOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </SelectField>
            <SelectField label="Date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>
              <option>All dates</option>
              {listState.dateOptions.map((value) => <option key={value} value={value}>{value}</option>)}
            </SelectField>
            <SelectField label="GPS" value={gpsFilter} onChange={(event) => setGpsFilter(event.target.value)}>
              <option>All locations</option>
              <option>Has GPS</option>
              <option>Missing GPS</option>
            </SelectField>
          </div>
          {successMessage ? <div className="border-b border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{successMessage}</div> : null}
          {errorMessage && visibleRows.length === 0 ? (
            <div className="p-5"><StateCard title="Uploads unavailable" description={errorMessage} tone="red" /></div>
          ) : visibleRows.length === 0 ? (
            <div className="p-5"><StateCard title="No uploads yet" description="Photo evidence will appear here after the first field upload." tone="slate" /></div>
          ) : (
            <div className="space-y-3 p-4">
              {visibleRows.map((upload) => <UploadListCard key={upload.id} upload={upload} selected={selectedUpload?.id === upload.id} onSelect={setSelectedUploadId} />)}
            </div>
          )}
          </Card>
        </div>
        <div className="min-w-0 space-y-4">
          <UploadCreateCard
            canCreate={permissions.uploads.canCreate}
            jobs={allowedJobs}
            draft={draft}
            setDraft={setDraft}
            onRequestLocation={handleRequestLocation}
            onFileChange={handleFileChange}
            onSubmit={handleSubmit}
            loading={busy}
            fileError={fileError}
          />
          <UploadDetailPanel upload={selectedUpload} token={sessionToken} canManage={permissions.uploads.canManageAll} disabled={busy} onSave={handleSaveUpload} onArchive={handleArchiveSelected} />
        </div>
      </div>
    </div>
  );
}
