import { useEffect, useMemo, useRef, useState } from "react";

import {
  Badge,
  Button,
  Card,
  FilterBar,
  Icon,
  InputField,
  PageHeader,
  SectionHeader,
  SelectField,
  StateCard,
  TextAreaField,
} from "./app-shell-components";
import { CommandCenterKpiCard, ModuleKpiStrip } from "./command-center-route-components";
import { jobTitle } from "./job-utils";
import {
  CUSTOMER_MATCH_STATUSES,
  IMPORTED_JOB_DRAFT_STATUSES,
  filterImportedJobDrafts,
  formatImportedDraftSummary,
  getCustomerMatchWarnings,
  getImportedDraftWarnings,
  getImportedJobDraftStats,
  isImportedDraftReadyForJob,
  normalizeImportedJobDraft,
  normalizeImportedJobDrafts,
  validateJobDraftImportPackage,
} from "../shared/jobDraftImports.js";

function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
function importedDraftStatusTone(status) {
  if (status === "Job Created" || status === "Ready to Create Job") return "green";
  if (status === "Needs Review") return "amber";
  if (status === "Rejected") return "red";
  return "blue";
}

function customerMatchStatusTone(status) {
  if (status === "Matched" || status === "Confirmed") return "green";
  if (status === "Review Required" || status === "Possible Match") return "amber";
  if (status === "New Customer Needed" || status === "No Match") return "blue";
  return "slate";
}

function importedDraftImportedAt(draft) {
  return draft?.importedAt || draft?.createdAt || draft?.updatedAt;
}

function importedDraftLocation(draft) {
  return [draft?.city, draft?.state].filter(Boolean).join(", ") || "Location needs review";
}

function importedDraftSearchMatch(draft, query) {
  const normalizedQuery = String(query || "").trim().toLowerCase();
  if (!normalizedQuery) return true;
  const haystack = [
    draft.jobName,
    draft.customerName,
    draft.contactName,
    draft.city,
    draft.state,
    draft.serviceType,
    draft.projectType,
    draft.scopeSummary,
    draft.opsReadinessLabel,
    draft.importStatus,
    draft.customerMatchStatus,
    draft.opsJobDraftId,
    draft.sourceHandoffId,
  ].filter(Boolean).join(" ").toLowerCase();
  return haystack.includes(normalizedQuery);
}

export function ImportedJobDraftsPage({
  drafts,
  jobs,
  customers,
  selectedDraftId,
  onSelectDraft,
  onBackToDrafts,
  onImportPackage,
  onSaveDraft,
  onCreateJobFromDraft,
  onOpenCreatedJob,
  busy,
  permissions,
}) {
  if (!permissions.jobDraftImports?.canView) {
    return (
      <div className="co-office-page co-imports-page">
        <PageHeader eyebrow="Office" title="Imported Drafts" description="Imported draft packages are only available to office roles that can create jobs." />
        <div className="px-5 sm:px-6 lg:px-8">
          <StateCard title="Imported drafts unavailable" description="This role cannot import or create jobs from external draft packages." tone="slate" />
        </div>
      </div>
    );
  }

  const selectedDraft = drafts.find((draft) => draft.id === selectedDraftId) || null;

  if (selectedDraft) {
    return (
      <ImportedJobDraftDetailPage
        draft={selectedDraft}
        jobs={jobs}
        customers={customers}
        onBack={onBackToDrafts}
        onCreateJobFromDraft={onCreateJobFromDraft}
        onOpenCreatedJob={onOpenCreatedJob}
        onSaveDraft={onSaveDraft}
        busy={busy}
        permissions={permissions}
      />
    );
  }

  return (
      <ImportedJobDraftListPage
        drafts={drafts}
        onImportPackage={onImportPackage}
        onOpenCreatedJob={onOpenCreatedJob}
        onSelectDraft={onSelectDraft}
        busy={busy}
        permissions={permissions}
      />
    );
  }

function ImportedDraftsTablePolished({ drafts, selectedId, onSelect, onReview, onOpenCreatedJob }) {
  return (
    <>
      <div className="co-imports-mobile-list grid gap-3 p-3 md:hidden">
        {drafts.map((draft) => {
          const selected = draft.id === selectedId;

          return (
            <button
              key={draft.id}
              type="button"
              onClick={() => onReview(draft.id)}
              className={`co-imports-mobile-card co-mobile-record-card w-full rounded-[1.05rem] border p-4 text-left transition ${selected ? "is-selected border-orange-200 bg-orange-50/75" : "border-slate-200 bg-white hover:border-orange-200 hover:bg-orange-50/35"}`}
            >
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="break-words text-base font-black text-slate-950">{draft.jobName || "Untitled imported draft"}</p>
                  <p className="mt-1 break-words text-xs font-bold text-slate-500">{draft.customerName || "Customer pending"} / {importedDraftLocation(draft)}</p>
                </div>
                <Badge tone={importedDraftStatusTone(draft.importStatus)}>{draft.importStatus}</Badge>
              </div>
              <div className="co-imports-mobile-metrics">
                <span>Match <strong>{draft.customerMatchStatus || "Not Checked"}</strong></span>
                <span>Ready <strong>{draft.opsReadinessLabel || "Needs review"}</strong></span>
                <span>Job <strong>{draft.createdJobId ? "Created" : "Not created"}</strong></span>
              </div>
            </button>
          );
        })}
      </div>
      <div className="co-imports-list-scroll hidden min-w-0 overflow-auto md:block">
        <table className="co-imports-command-table w-full min-w-[980px] text-left">
          <thead>
            <tr>
              <th>Draft / Customer</th>
              <th>Status</th>
              <th>Match</th>
              <th>Readiness</th>
              <th>Service</th>
              <th>Imported</th>
              <th>Open</th>
            </tr>
          </thead>
          <tbody>
            {drafts.map((draft) => {
              const selected = draft.id === selectedId;

              return (
                <tr key={draft.id} onClick={() => onSelect(draft.id)} className={`cursor-pointer transition hover:bg-orange-50/45 ${selected ? "bg-orange-50/70" : ""}`}>
                  <td>
                    <p className="font-black text-slate-950">{draft.jobName || "Untitled imported draft"}</p>
                    <p className="text-xs font-bold text-slate-500">{draft.customerName || "Customer pending"} / {importedDraftLocation(draft)}</p>
                  </td>
                  <td><Badge tone={importedDraftStatusTone(draft.importStatus)}>{draft.importStatus}</Badge></td>
                  <td><Badge tone={customerMatchStatusTone(draft.customerMatchStatus)}>{draft.customerMatchStatus || "Not Checked"}</Badge></td>
                  <td>
                    <p className="font-bold text-slate-700">{draft.opsReadinessLabel || "Needs review"}</p>
                    <p className="text-xs font-bold text-slate-500">{draft.opsReadinessScore !== "" ? `Score ${draft.opsReadinessScore}` : "No score"}</p>
                  </td>
                  <td>
                    <p className="font-bold text-slate-700">{draft.serviceType || draft.projectType || "Service pending"}</p>
                    <p className="text-xs font-bold text-slate-500">{draft.scopeSummary || "Scope pending"}</p>
                  </td>
                  <td className="font-bold text-slate-700">{formatDateTime(importedDraftImportedAt(draft))}</td>
                  <td>
                    <div className="flex gap-1.5">
                      {draft.createdJobId ? (
                        <button type="button" className="co-imports-icon-button" onClick={(event) => { event.stopPropagation(); onOpenCreatedJob(draft.createdJobId); }} aria-label={`Open created job for imported draft ${draft.id}`}>
                          <Icon name="briefcase" />
                        </button>
                      ) : null}
                      <button type="button" className="co-imports-icon-button" onClick={(event) => { event.stopPropagation(); onReview(draft.id); }} aria-label={`Review imported draft ${draft.id}`}>
                        <Icon name="arrowUpRight" />
                      </button>
                    </div>
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

function ImportedDraftCommandRailPolished({ draft, canManage, onReview, onImportClick, onOpenCreatedJob }) {
  if (!draft) {
    return (
      <div className="co-imports-right-rail co-imports-office-assistant space-y-4">
        <div className="co-imports-rail-card co-imports-assistant-card p-4">
          <SectionHeader title="Draft Console" description="Import a package or select a draft for office review." />
          <div className="co-imports-empty-rail">
            <span><Icon name="database" /></span>
            <strong>No imported draft selected</strong>
            <p>Imported packages will show customer match, readiness, service type, and job creation status here.</p>
          </div>
          {canManage ? <Button type="button" className="mt-3 w-full" onClick={onImportClick}>Import Package</Button> : null}
        </div>
      </div>
    );
  }

  const warnings = getImportedDraftWarnings(draft);
  const customerWarnings = getCustomerMatchWarnings(draft);

  return (
    <div className="co-imports-right-rail co-imports-office-assistant space-y-4">
      <div className="co-imports-rail-card co-imports-assistant-card p-4">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Selected draft</p>
            <h3 className="mt-2 break-words text-xl font-black leading-tight text-slate-950">{draft.jobName || "Untitled imported draft"}</h3>
            <p className="mt-1 break-words text-xs font-black text-slate-500">{draft.customerName || "Customer pending"} / {importedDraftLocation(draft)}</p>
          </div>
          <Badge tone={importedDraftStatusTone(draft.importStatus)}>{draft.importStatus}</Badge>
        </div>

        <div className="co-imports-selected-metrics">
          <div>
            <span>Customer Match</span>
            <strong>{draft.customerMatchStatus || "Not Checked"}</strong>
          </div>
          <div>
            <span>Readiness</span>
            <strong>{draft.opsReadinessLabel || "Needs review"}</strong>
          </div>
          <div>
            <span>Service</span>
            <strong>{draft.serviceType || draft.projectType || "Pending"}</strong>
          </div>
          <div>
            <span>Created Job</span>
            <strong>{draft.createdJobId ? "Created" : "Not created"}</strong>
          </div>
        </div>

        <div className="co-imports-note-panel">
          <span>Scope summary</span>
          <p>{draft.scopeSummary || draft.jobDraftSummary || "No scope summary recorded yet."}</p>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button type="button" size="sm" onClick={() => onReview(draft.id)}>Review Draft</Button>
          {draft.createdJobId ? <Button type="button" size="sm" variant="secondary" onClick={() => onOpenCreatedJob(draft.createdJobId)}>Open Job</Button> : null}
        </div>
      </div>

      <div className="co-imports-rail-card co-imports-assistant-card p-4">
        <SectionHeader title="Readiness Checks" description="Resolve these before converting to a real job." />
        <div className="co-imports-readiness-list">
          <span data-state={draft.customerName ? "ready" : "needs"}>Customer <strong>{draft.customerName ? "Set" : "Needed"}</strong></span>
          <span data-state={["Matched", "Confirmed", "New Customer Needed", "No Match"].includes(draft.customerMatchStatus) ? "ready" : "needs"}>Match <strong>{draft.customerMatchStatus || "Review"}</strong></span>
          <span data-state={draft.jobName && draft.scopeSummary ? "ready" : "needs"}>Scope <strong>{draft.jobName && draft.scopeSummary ? "Set" : "Needed"}</strong></span>
          <span data-state={warnings.length || customerWarnings.length ? "needs" : "ready"}>Warnings <strong>{warnings.length + customerWarnings.length}</strong></span>
        </div>
      </div>
    </div>
  );
}

function ImportedDraftsMobileFocusPanel({
  stats,
  filteredCount,
  visibleWarnings,
  matchReviewCount,
  canManage,
  onImport,
  onOpenBoard,
  onOpenNeedsReview,
  onOpenReady,
  onOpenMatchReview,
}) {
  const focusLabel = stats.total
    ? `${filteredCount} visible / ${visibleWarnings} warning${visibleWarnings === 1 ? "" : "s"}`
    : "Import queue ready";

  return (
    <section className="co-imports-mobile-focus mx-4 mb-3 md:hidden" aria-label="Imported drafts mobile focus">
      <div className="co-imports-mobile-focus-copy">
        <span>Draft Intake</span>
        <h2>{stats.total ? "Review before job creation" : "Ready for the first package"}</h2>
        <p>{stats.total ? focusLabel : "Load the next Apex HQ Job Draft Package, review customer match, then create the real job when the office is ready."}</p>
      </div>
      <div className="co-imports-mobile-focus-actions">
        {canManage ? (
          <Button type="button" onClick={onImport}>
            <Icon name="upload" />
            Import Package
          </Button>
        ) : null}
        <Button type="button" variant={canManage ? "secondary" : undefined} onClick={onOpenBoard}>
          <Icon name="database" />
          View Board
        </Button>
      </div>
      <div className="co-imports-mobile-focus-metrics">
        <button type="button" onClick={onOpenBoard} data-tone={stats.total ? "orange" : "slate"}>
          <span>Drafts</span>
          <strong>{stats.total}</strong>
        </button>
        <button type="button" onClick={onOpenNeedsReview} data-tone={stats.needsReview ? "amber" : "green"}>
          <span>Needs review</span>
          <strong>{stats.needsReview}</strong>
        </button>
        <button type="button" onClick={onOpenReady} data-tone={stats.readyToCreate ? "green" : "slate"}>
          <span>Ready</span>
          <strong>{stats.readyToCreate}</strong>
        </button>
        <button type="button" onClick={onOpenMatchReview} data-tone={matchReviewCount ? "amber" : "green"}>
          <span>Match</span>
          <strong>{matchReviewCount}</strong>
        </button>
      </div>
    </section>
  );
}

function ImportedDraftImportPanelPolished({ busy, importMessage, onImportFile }) {
  return (
    <Card className="co-imports-form-card p-4">
      <SectionHeader title="Import Package" description="Load an Apex HQ Job Draft Package JSON file for office review before job creation." />
      <div className="co-imports-import-box">
        <span><Icon name="upload" /></span>
        <div className="min-w-0">
          <strong>Job Draft Package</strong>
          <p>Choose the exported JSON package. Sensitive keys are stripped by the import normalizer.</p>
        </div>
        <label className={`co-imports-file-button ${busy ? "is-disabled" : ""}`}>
          Import JSON
          <input className="hidden" type="file" accept="application/json,.json" onChange={onImportFile} disabled={busy} />
        </label>
      </div>
      {importMessage ? <div className="co-imports-message mt-3">{importMessage}</div> : null}
      <div className="co-imports-endpoint-note mt-3">
        <span>Integration</span>
        <p>Direct import endpoint remains available for proposal app integration.</p>
      </div>
    </Card>
  );
}

function ImportedJobDraftListPagePolished({ drafts, onImportPackage, onOpenCreatedJob, onSelectDraft, busy, permissions }) {
  const [statusFilter, setStatusFilter] = useState("All");
  const [readinessFilter, setReadinessFilter] = useState("All");
  const [serviceTypeFilter, setServiceTypeFilter] = useState("All");
  const [createdFilter, setCreatedFilter] = useState("All");
  const [cityFilter, setCityFilter] = useState("");
  const [search, setSearch] = useState("");
  const [importMessage, setImportMessage] = useState("");
  const [selectedDraftId, setSelectedDraftId] = useState("");
  const [showTools, setShowTools] = useState(false);
  const toolsRef = useRef(null);
  const boardRef = useRef(null);
  const normalizedDrafts = useMemo(() => normalizeImportedJobDrafts(drafts), [drafts]);
  const stats = getImportedJobDraftStats(normalizedDrafts);
  const readinessLabels = useMemo(() => Array.from(new Set(normalizedDrafts.map((draft) => draft.opsReadinessLabel).filter(Boolean))).sort(), [normalizedDrafts]);
  const serviceTypes = useMemo(() => Array.from(new Set(normalizedDrafts.map((draft) => draft.serviceType).filter(Boolean))).sort(), [normalizedDrafts]);
  const filteredDrafts = useMemo(() => filterImportedJobDrafts(normalizedDrafts, { cityFilter, createdFilter, readinessFilter, serviceTypeFilter, statusFilter }).filter((draft) => importedDraftSearchMatch(draft, search)), [cityFilter, createdFilter, normalizedDrafts, readinessFilter, search, serviceTypeFilter, statusFilter]);
  const selectedDraft = filteredDrafts.find((draft) => draft.id === selectedDraftId) || filteredDrafts[0] || null;
  const matchReviewCount = normalizedDrafts.filter((draft) => ["Review Required", "Possible Match", "Not Checked"].includes(draft.customerMatchStatus)).length;
  const visibleWarnings = filteredDrafts.reduce((count, draft) => count + getImportedDraftWarnings(draft).length + getCustomerMatchWarnings(draft).length, 0);
  const importKpis = [
    { label: "Imported Drafts", value: stats.total, helper: "Review before creating jobs", icon: "database", tone: "blue" },
    { label: "Needs Review", value: stats.needsReview, helper: "Missing info or not ready", icon: "alert", tone: stats.needsReview ? "amber" : "green", actionLabel: "Review", onAction: () => setStatusFilter("Needs Review") },
    { label: "Ready To Create", value: stats.readyToCreate, helper: "Ready for job creation", icon: "check", tone: stats.readyToCreate ? "green" : "slate", actionLabel: "Ready", onAction: () => setStatusFilter("Ready to Create Job") },
    { label: "Jobs Created", value: stats.jobCreated, helper: "Converted into jobs", icon: "briefcase", tone: stats.jobCreated ? "green" : "slate", actionLabel: "Created", onAction: () => setCreatedFilter("Created") },
    { label: "Match Review", value: matchReviewCount, helper: "Customer match attention", icon: "users", tone: matchReviewCount ? "amber" : "green" },
  ];

  useEffect(() => {
    if (!filteredDrafts.length) {
      if (selectedDraftId) setSelectedDraftId("");
      return;
    }
    if (!selectedDraftId || !filteredDrafts.some((draft) => draft.id === selectedDraftId)) {
      setSelectedDraftId(filteredDrafts[0].id);
    }
  }, [filteredDrafts, selectedDraftId]);

  async function handleImportFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportMessage("");

    try {
      if (!permissions?.jobDraftImports?.canManage) {
        throw new Error("Import is only available to office roles that can manage imported drafts.");
      }
      const parsed = JSON.parse(await file.text());
      const validation = validateJobDraftImportPackage(parsed);
      if (!validation.ok) {
        throw new Error(validation.errors.join(" "));
      }
      const result = await onImportPackage(parsed);
      if (!result) {
        throw new Error("Import did not complete. Check your role access and try again.");
      }
      setImportMessage(result.message || "Imported Job Draft Package.");
    } catch (error) {
      setImportMessage(error.message || "Could not import this JSON package.");
    } finally {
      event.target.value = "";
    }
  }

  function clearFilters() {
    setStatusFilter("All");
    setReadinessFilter("All");
    setServiceTypeFilter("All");
    setCreatedFilter("All");
    setCityFilter("");
    setSearch("");
  }

  function openTools() {
    if (!permissions?.jobDraftImports?.canManage) {
      setImportMessage("Import tools are only available to office roles that can manage imported drafts.");
      return;
    }
    setShowTools(true);
    window.setTimeout(() => toolsRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" }), 0);
  }

  function jumpToBoard() {
    window.setTimeout(() => boardRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" }), 0);
  }

  function openPriorityDraft(matchDraft, options = {}) {
    const targetDraft = filteredDrafts.find(matchDraft) || normalizedDrafts.find(matchDraft);
    if (options.statusFilter) setStatusFilter(options.statusFilter);
    if (options.readinessFilter) setReadinessFilter(options.readinessFilter);
    if (options.serviceTypeFilter) setServiceTypeFilter(options.serviceTypeFilter);
    if (options.createdFilter) setCreatedFilter(options.createdFilter);
    if (options.cityFilter !== undefined) setCityFilter(options.cityFilter);
    if (options.search !== undefined) setSearch(options.search);
    if (targetDraft?.id) setSelectedDraftId(targetDraft.id);
    if (options.review && targetDraft?.id) {
      onSelectDraft(targetDraft.id);
    }
  }

  const matchReviewDraft = normalizedDrafts.find((draft) => ["Review Required", "Possible Match", "Not Checked"].includes(draft.customerMatchStatus));
  const needsReviewPriorityCard = {
    label: "Needs review",
    value: stats.needsReview,
    helper: stats.needsReview ? "Missing info, warnings, or readiness gaps need office review." : "No imported draft is currently marked needs-review.",
    icon: "alert",
    tone: stats.needsReview ? "amber" : "green",
    actionLabel: stats.needsReview ? "Review" : "All clear",
    onAction: () => openPriorityDraft((draft) => draft.importStatus === "Needs Review", { statusFilter: stats.needsReview ? "Needs Review" : "All", review: Boolean(stats.needsReview) }),
  };
  const readyPriorityCard = {
    label: "Ready to create",
    value: stats.readyToCreate,
    helper: stats.readyToCreate ? "Drafts are ready to become real jobs after final office check." : "No draft is ready for job creation yet.",
    icon: "check",
    tone: stats.readyToCreate ? "green" : "slate",
    actionLabel: stats.readyToCreate ? "Open ready" : "Not ready",
    onAction: () => openPriorityDraft((draft) => draft.importStatus === "Ready to Create Job", { statusFilter: stats.readyToCreate ? "Ready to Create Job" : "All", review: Boolean(stats.readyToCreate) }),
  };
  const matchPriorityCard = {
    label: "Match review",
    value: matchReviewCount,
    helper: matchReviewCount ? "Customer matching needs a look before creating jobs." : "Customer match state is clean in the imported list.",
    icon: "users",
    tone: matchReviewCount ? "orange" : "green",
    actionLabel: matchReviewCount ? "Review match" : "Matched",
    onAction: () => openPriorityDraft((draft) => draft.id === matchReviewDraft?.id, { review: Boolean(matchReviewDraft) }),
  };
  const importPriorityCard = {
    label: "Import package",
    value: permissions?.jobDraftImports?.canManage ? "Ready" : stats.total,
    helper: permissions?.jobDraftImports?.canManage ? "Load a JSON package into the review queue." : "Review-only access keeps job creation controlled.",
    icon: "upload",
    tone: permissions?.jobDraftImports?.canManage ? "blue" : "slate",
    actionLabel: permissions?.jobDraftImports?.canManage ? "Import" : "View only",
    onAction: () => permissions?.jobDraftImports?.canManage ? openTools() : openPriorityDraft((draft) => draft.id === selectedDraft?.id),
  };
  const importsPriorityCards = filteredDrafts.length === 0 && permissions?.jobDraftImports?.canManage
    ? [importPriorityCard, needsReviewPriorityCard, readyPriorityCard, matchPriorityCard]
    : [needsReviewPriorityCard, readyPriorityCard, matchPriorityCard, importPriorityCard];

  return (
    <div className="co-office-page co-imports-page">
      <PageHeader
        eyebrow="Office"
        title="Imported Drafts"
        description="Import job draft packages, review customer match and missing details, then create a real Apex HQ job when the office is ready."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => setStatusFilter("All")}>{filteredDrafts.length} visible</Button>
            {permissions?.jobDraftImports?.canManage ? <Button type="button" onClick={openTools}>Import Package</Button> : null}
          </div>
        }
      />

      <ImportedDraftsMobileFocusPanel
        stats={stats}
        filteredCount={filteredDrafts.length}
        visibleWarnings={visibleWarnings}
        matchReviewCount={matchReviewCount}
        canManage={Boolean(permissions?.jobDraftImports?.canManage)}
        onImport={openTools}
        onOpenBoard={jumpToBoard}
        onOpenNeedsReview={() => openPriorityDraft((draft) => draft.importStatus === "Needs Review", { statusFilter: stats.needsReview ? "Needs Review" : "All" })}
        onOpenReady={() => openPriorityDraft((draft) => draft.importStatus === "Ready to Create Job", { statusFilter: stats.readyToCreate ? "Ready to Create Job" : "All" })}
        onOpenMatchReview={() => openPriorityDraft((draft) => draft.id === matchReviewDraft?.id)}
      />

      <div className="co-imports-kpi-grid mx-auto grid w-full max-w-[1520px] min-w-0 grid-cols-1 gap-3 px-5 pb-3 sm:px-6 md:grid-cols-5 lg:px-6">
        {importKpis.map((item) => <CommandCenterKpiCard key={item.label} item={item} />)}
      </div>

      <div className="co-toolbox-priority-grid mx-auto grid w-full max-w-[1520px] min-w-0 gap-3 px-5 pb-3 sm:px-6 md:grid-cols-2 xl:grid-cols-4 lg:px-6">
        {importsPriorityCards.map((card) => (
          <button key={card.label} type="button" className="co-toolbox-priority-card co-focus-ring" data-tone={card.tone} onClick={card.onAction}>
            <span className="co-toolbox-priority-icon"><Icon name={card.icon} className="h-4 w-4" /></span>
            <span className="min-w-0">
              <span className="co-toolbox-priority-value">{card.value}</span>
              <span className="co-toolbox-priority-label">{card.label}</span>
              <span className="co-toolbox-priority-helper">{card.helper}</span>
            </span>
            <span className="co-toolbox-priority-action">{card.actionLabel} -&gt;</span>
          </button>
        ))}
      </div>

      <div className="co-imports-command-layout mx-auto grid w-full max-w-[1520px] min-w-0 gap-3 px-5 pb-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-6">
        <div ref={boardRef}>
          <Card className="co-imports-main-board overflow-hidden">
            <div className="co-imports-board-header border-b border-slate-200 bg-white p-4">
              <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <h2 className="text-base font-black uppercase tracking-[0.04em] text-slate-950">Draft Intake Board</h2>
                  <p className="mt-1 text-sm font-bold leading-5 text-slate-600">Review imported packages, customer match state, readiness, service type, warnings, and job conversion status.</p>
                </div>
              </div>
            </div>
            <FilterBar filters={["All", "Needs Review", "Ready to Create Job", "Job Created"]} active={statusFilter} setActive={setStatusFilter} search={search} setSearch={setSearch} placeholder="Search draft, customer, city, service, handoff..." />
            <details className="co-imports-advanced-filters border-b border-slate-200 bg-white">
              <summary>
                <span>Advanced filters</span>
                <span>{[readinessFilter !== "All" ? readinessFilter : "", serviceTypeFilter !== "All" ? serviceTypeFilter : "", createdFilter !== "All" ? createdFilter : "", cityFilter].filter(Boolean).length || "Readiness, service, city"}</span>
              </summary>
              <div className="co-office-filter-grid co-imports-filter-grid grid gap-3 p-3 md:grid-cols-4">
                <SelectField label="Readiness" value={readinessFilter} onChange={(event) => setReadinessFilter(event.target.value)}>
                  <option>All</option>
                  {readinessLabels.map((label) => <option key={label}>{label}</option>)}
                </SelectField>
                <SelectField label="Service type" value={serviceTypeFilter} onChange={(event) => setServiceTypeFilter(event.target.value)}>
                  <option>All</option>
                  {serviceTypes.map((type) => <option key={type}>{type}</option>)}
                </SelectField>
                <SelectField label="Created job" value={createdFilter} onChange={(event) => setCreatedFilter(event.target.value)}>
                  <option>All</option>
                  <option>Created</option>
                  <option>Not Created</option>
                </SelectField>
                <InputField label="City" value={cityFilter} onChange={(event) => setCityFilter(event.target.value)} placeholder="Filter city..." />
              </div>
            </details>
            {importMessage ? <div className="border-b border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{importMessage}</div> : null}
            {filteredDrafts.length === 0 ? (
              <div className="co-imports-empty-board p-4">
                <div className="co-imports-empty-board-card">
                  <span><Icon name="database" /></span>
                  <div className="min-w-0">
                    <strong>{normalizedDrafts.length === 0 ? "No imported drafts yet" : "No drafts match these filters"}</strong>
                    <p>{normalizedDrafts.length === 0 ? "Import an Apex HQ Job Draft Package JSON file, review the customer match, then create the real job when the office is ready." : "Clear a filter or search another customer, city, service, or handoff."}</p>
                    <div className="co-imports-empty-steps">
                      <b>1. Import package</b>
                      <b>2. Review match</b>
                      <b>3. Create job</b>
                    </div>
                  </div>
                  {permissions?.jobDraftImports?.canManage ? <Button type="button" onClick={openTools}>Import Package</Button> : null}
                </div>
              </div>
            ) : (
              <ImportedDraftsTablePolished drafts={filteredDrafts} selectedId={selectedDraft?.id} onSelect={setSelectedDraftId} onReview={onSelectDraft} onOpenCreatedJob={onOpenCreatedJob} />
            )}
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3">
              <p className="text-sm font-bold text-slate-600">Showing {filteredDrafts.length} imported draft{filteredDrafts.length === 1 ? "" : "s"} / {visibleWarnings} warning{visibleWarnings === 1 ? "" : "s"}</p>
              <Button type="button" size="sm" variant="secondary" onClick={clearFilters}>Clear filters</Button>
            </div>
          </Card>
        </div>

        <ImportedDraftCommandRailPolished draft={selectedDraft} canManage={Boolean(permissions?.jobDraftImports?.canManage)} onReview={onSelectDraft} onImportClick={openTools} onOpenCreatedJob={onOpenCreatedJob} />
      </div>

      {permissions?.jobDraftImports?.canManage ? <details
        ref={toolsRef}
        className="co-imports-tools-drawer mx-auto w-full max-w-[1520px] min-w-0 px-5 pb-24 sm:px-6 md:pb-4 lg:px-8"
        open={showTools}
        onToggle={(event) => setShowTools(event.currentTarget.open)}
      >
        <summary>
          <span>
            <strong>Import Tools</strong>
            <em>Load JSON packages and keep proposal-app intake separate from real job creation until office review is complete.</em>
          </span>
          <span>Open tools</span>
        </summary>
        <div className="co-imports-tools-panel mt-3">
          <ImportedDraftImportPanelPolished busy={busy} importMessage={importMessage} onImportFile={handleImportFile} />
        </div>
      </details> : null}
    </div>
  );
}

function ImportedJobDraftListPage(props) {
  return <ImportedJobDraftListPagePolished {...props} />;
}

function ImportedJobDraftListPageLegacy({ drafts, onImportPackage, onOpenCreatedJob, onSelectDraft, busy }) {
  const [statusFilter, setStatusFilter] = useState("All");
  const [readinessFilter, setReadinessFilter] = useState("All");
  const [serviceTypeFilter, setServiceTypeFilter] = useState("All");
  const [createdFilter, setCreatedFilter] = useState("All");
  const [cityFilter, setCityFilter] = useState("");
  const [importMessage, setImportMessage] = useState("");
  const stats = getImportedJobDraftStats(drafts);
  const readinessLabels = useMemo(() => Array.from(new Set(drafts.map((draft) => draft.opsReadinessLabel).filter(Boolean))).sort(), [drafts]);
  const serviceTypes = useMemo(() => Array.from(new Set(drafts.map((draft) => draft.serviceType).filter(Boolean))).sort(), [drafts]);
  const filteredDrafts = filterImportedJobDrafts(drafts, { cityFilter, createdFilter, readinessFilter, serviceTypeFilter, statusFilter });
  const importKpis = [
    { label: "Imported Drafts", value: stats.total, helper: "Review before creating jobs", icon: "database" },
    { label: "Needs Review", value: stats.needsReview, helper: "Missing info or not ready", icon: "alert" },
    { label: "Ready To Create", value: stats.readyToCreate, helper: "Ready for job creation", icon: "check" },
    { label: "Jobs Created", value: stats.jobCreated, helper: "Converted into jobs", icon: "briefcase" },
  ];

  async function handleImportFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportMessage("");

    try {
      const parsed = JSON.parse(await file.text());
      const validation = validateJobDraftImportPackage(parsed);
      if (!validation.ok) {
        throw new Error(validation.errors.join(" "));
      }
      const result = await onImportPackage(parsed);
      setImportMessage(result?.message || "Imported Job Draft Package.");
    } catch (error) {
      setImportMessage(error.message || "Could not import this JSON package.");
    } finally {
      event.target.value = "";
    }
  }

  return (
    <div className="co-office-page co-imports-page">
      <PageHeader
        eyebrow="Office"
        title="Imported Job Drafts"
        description="Import job draft packages, review missing details, and create a real Apex HQ job only when the office is ready."
        actions={
          <label className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-blue-700 px-4 py-2.5 text-sm font-black text-white shadow-sm shadow-blue-700/20 transition hover:bg-blue-800 ${busy ? "opacity-70" : ""}`}>
            <Icon name="upload" />
            Import Job Draft Package
            <input className="hidden" type="file" accept="application/json,.json" onChange={handleImportFile} disabled={busy} />
          </label>
        }
      />
      <ModuleKpiStrip items={importKpis} />
      <div className="grid gap-4 px-5 sm:px-6 lg:px-8">
        {importMessage ? <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">{importMessage}</div> : null}
        <div className="rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm font-bold text-slate-600">
          Direct import endpoint available for proposal app integration.
        </div>
        <Card className="overflow-hidden">
          <div className="co-office-filter-grid grid gap-3 border-b border-blue-100 bg-blue-50/50 p-4 md:grid-cols-5">
            <SelectField label="Import status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option>All</option>
              {IMPORTED_JOB_DRAFT_STATUSES.map((status) => <option key={status}>{status}</option>)}
            </SelectField>
            <SelectField label="Readiness" value={readinessFilter} onChange={(event) => setReadinessFilter(event.target.value)}>
              <option>All</option>
              {readinessLabels.map((label) => <option key={label}>{label}</option>)}
            </SelectField>
            <SelectField label="Service type" value={serviceTypeFilter} onChange={(event) => setServiceTypeFilter(event.target.value)}>
              <option>All</option>
              {serviceTypes.map((type) => <option key={type}>{type}</option>)}
            </SelectField>
            <SelectField label="Created job" value={createdFilter} onChange={(event) => setCreatedFilter(event.target.value)}>
              <option>All</option>
              <option>Created</option>
              <option>Not Created</option>
            </SelectField>
            <InputField label="City" value={cityFilter} onChange={(event) => setCityFilter(event.target.value)} placeholder="Filter city..." />
          </div>
          {filteredDrafts.length === 0 ? (
            <div className="p-5">
              <StateCard title="No imported drafts yet" description="Import an Apex HQ Job Draft Package JSON file to review it before creating a real job." />
            </div>
          ) : (
            <div className="divide-y divide-blue-100">
              {filteredDrafts.map((draft) => (
                <div key={draft.id} className="co-office-list-card block w-full text-left transition hover:bg-blue-50/60">
                  <div className="grid gap-3 p-4 lg:grid-cols-[1.2fr_0.8fr_0.7fr_auto] lg:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-black text-slate-950">{draft.jobName || "Untitled imported draft"}</p>
                        <Badge tone={importedDraftStatusTone(draft.importStatus)}>{draft.importStatus}</Badge>
                        <Badge tone={customerMatchStatusTone(draft.customerMatchStatus)}>{draft.customerMatchStatus || "Not Checked"}</Badge>
                      </div>
                      <p className="mt-1 text-sm font-bold text-slate-600">{draft.customerName || "Customer pending"}</p>
                      <p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-400">{[draft.city, draft.state].filter(Boolean).join(", ") || "Location needs review"}</p>
                    </div>
                    <div className="min-w-0 text-sm text-slate-600">
                      <p className="font-black text-slate-700">{draft.serviceType || draft.projectType || "Service type pending"}</p>
                      <p className="mt-1 line-clamp-2">{draft.scopeSummary || "Scope summary pending."}</p>
                    </div>
                    <div className="text-sm text-slate-600">
                      <p className="font-black text-slate-700">Readiness</p>
                      <p>{draft.opsReadinessLabel || "Needs review"}{draft.opsReadinessScore !== "" ? ` (${draft.opsReadinessScore})` : ""}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      {draft.createdJobId ? <Button type="button" size="sm" onClick={() => onOpenCreatedJob(draft.createdJobId)}>Open job</Button> : null}
                      <Button type="button" size="sm" variant={draft.createdJobId ? "secondary" : "primary"} onClick={() => onSelectDraft(draft.id)}>Review</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function ImportedDraftCustomerMatchCard({ draft, customers = [], warnings = [], onUpdate }) {
  const activeCustomers = (Array.isArray(customers) ? customers : []).filter((customer) => !customer.archivedAt);
  const matchedCustomer = activeCustomers.find((customer) => customer.id === draft.matchedCustomerId) || null;
  const statusHelp = {
    Matched: "Apex HQ found one safe existing customer match. Confirm it if it looks right.",
    Confirmed: "The office confirmed this draft should use the selected existing customer.",
    "Review Required": "Possible duplicate or conflicting customer info. Choose or confirm a customer before creating the job.",
    "Possible Match": "Apex HQ found a possible match, but the office should confirm it first.",
    "New Customer Needed": "No existing customer matched. A new customer will be created only when the job is created.",
    "Not Checked": "Customer matching has not been reviewed yet.",
    "No Match": "No matching customer was found.",
  };

  function setConfirmedCustomer(customerId, reason = "Office confirmed this customer match.") {
    const customer = activeCustomers.find((item) => item.id === customerId);
    if (!customer) return;
    onUpdate({
      matchedCustomerId: customer.id,
      matchedCustomerName: customer.name || customer.company || "",
      customerMatchStatus: "Confirmed",
      customerMatchConfidence: 100,
      customerMatchReason: reason,
    });
  }

  return (
    <Card className="co-imports-match-card p-5">
      <SectionHeader
        title="Customer match review"
        description="Prevent duplicate customer records before this draft becomes a real job."
        action={<Badge tone={customerMatchStatusTone(draft.customerMatchStatus)}>{draft.customerMatchStatus || "Not Checked"}</Badge>}
      />
      <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold leading-6 text-blue-900">
        <p>{statusHelp[draft.customerMatchStatus] || "Review the imported customer before creating the job."}</p>
        {["Review Required", "Possible Match", "Not Checked"].includes(draft.customerMatchStatus) ? (
          <p className="mt-1 text-amber-800">Create Job is blocked until the office confirms a match or chooses to create a new customer.</p>
        ) : null}
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
          <p className="text-xs font-black uppercase tracking-widest text-blue-700">Imported customer/contact</p>
          <div className="mt-2 space-y-1 text-sm text-slate-700">
            <p className="font-black text-slate-950">{draft.customerName || "Customer name missing"}</p>
            <p>{draft.contactName || "Contact name missing"}</p>
            <p>{draft.contactEmail || "Email missing"}</p>
            <p>{draft.contactPhone || "Phone missing"}</p>
            <p>{[draft.city, draft.state].filter(Boolean).join(", ") || "Location needs review"}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">Selected Apex HQ customer</p>
          <div className="mt-2 space-y-1 text-sm text-slate-700">
            <p className="font-black text-slate-950">{matchedCustomer?.name || draft.matchedCustomerName || "No customer selected"}</p>
            <p>{matchedCustomer?.email || "Email not on matched customer"}</p>
            <p>{matchedCustomer?.phone || "Phone not on matched customer"}</p>
            <p>{draft.customerMatchReason || "Review or confirm this match before job creation."}</p>
          </div>
        </div>
      </div>
      {warnings.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
          {warnings.map((warning) => <p key={warning}>{warning}</p>)}
        </div>
      ) : null}
      <div className="mt-4 grid gap-3">
        <SelectField
          label="Choose different customer"
          value={draft.matchedCustomerId}
          onChange={(event) => setConfirmedCustomer(event.target.value, "Office chose this existing customer.")}
        >
          <option value="">Choose customer...</option>
          {activeCustomers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {[customer.name, customer.city].filter(Boolean).join(" - ")}
            </option>
          ))}
        </SelectField>
        <div className="co-imports-match-actions flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => setConfirmedCustomer(draft.matchedCustomerId)} disabled={!draft.matchedCustomerId}>Confirm Match</Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onUpdate({
              matchedCustomerId: "",
              matchedCustomerName: "",
              matchedContactId: "",
              customerMatchStatus: "New Customer Needed",
              customerMatchConfidence: "",
              customerMatchReason: "Office chose to create a new customer when creating the job.",
              customerMatchCandidates: draft.customerMatchCandidates,
            })}
          >
            Create New Customer When Job Is Created
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onUpdate({
              matchedCustomerId: "",
              matchedCustomerName: "",
              matchedContactId: "",
              customerMatchStatus: "Not Checked",
              customerMatchConfidence: "",
              customerMatchReason: "",
              customerMatchCandidates: [],
              customerMatchOverrideReason: "",
            })}
          >
            Clear Match
          </Button>
        </div>
      </div>
      {draft.customerMatchCandidates.length > 0 ? (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">Suggested matches</p>
          {draft.customerMatchCandidates.map((candidate) => (
            <div key={candidate.customerId || candidate.name} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
              <div className="min-w-0">
                <p className="font-black text-slate-950">{candidate.name || "Unnamed customer"} <span className="text-slate-400">({candidate.confidence || "?"}%)</span></p>
                <p className="text-slate-600">{candidate.reason || "Possible customer match."}</p>
              </div>
              {candidate.customerId ? <Button type="button" size="sm" variant="secondary" onClick={() => setConfirmedCustomer(candidate.customerId, `Office confirmed suggested match: ${candidate.reason || candidate.name}.`)}>Use this customer</Button> : null}
            </div>
          ))}
        </div>
      ) : null}
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <SelectField label="Match status" value={draft.customerMatchStatus} onChange={(event) => onUpdate({ customerMatchStatus: event.target.value })}>
          {CUSTOMER_MATCH_STATUSES.map((status) => <option key={status}>{status}</option>)}
        </SelectField>
        <InputField label="Matched customer name" value={draft.matchedCustomerName} onChange={(event) => onUpdate({ matchedCustomerName: event.target.value })} />
        <div className="md:col-span-2">
          <TextAreaField label="Match note / override reason" value={draft.customerMatchOverrideReason} onChange={(event) => onUpdate({ customerMatchOverrideReason: event.target.value })} placeholder="Example: Confirmed with office, same customer under alternate company name." />
        </div>
      </div>
      <p className="mt-3 text-xs font-bold text-slate-500">Save the imported draft to persist customer match changes.</p>
    </Card>
  );
}

function ImportedJobDraftDetailPage({ draft, jobs, customers, onBack, onCreateJobFromDraft, onOpenCreatedJob, onSaveDraft, busy, permissions }) {
  const [draftForm, setDraftForm] = useState(() => normalizeImportedJobDraft(draft));
  const [message, setMessage] = useState("");
  const createdJob = jobs.find((job) => job.id === draftForm.createdJobId);
  const canManageDraft = Boolean(permissions?.jobDraftImports?.canManage);
  const canCreateJob = Boolean(permissions?.jobDraftImports?.canCreateJob);
  const warnings = getImportedDraftWarnings(draftForm);
  const customerMatchWarnings = getCustomerMatchWarnings(draftForm);
  const readyForJob = isImportedDraftReadyForJob(draftForm, { allowMissingCityState: Boolean(draftForm.city && draftForm.state) });
  const customerMatchNeedsReview = ["Review Required", "Possible Match", "Not Checked"].includes(draftForm.customerMatchStatus);
  const workflowState = draftForm.createdJobId
    ? {
        label: "Job already created",
        tone: "green",
        nextStep: "Open the created job and finish scheduling, crew assignment, and startup checklist review.",
      }
    : customerMatchNeedsReview
      ? {
          label: "Customer match needed",
          tone: "amber",
          nextStep: "Confirm the existing customer or choose to create a new customer before creating the job.",
        }
      : readyForJob
        ? {
            label: "Ready to create job",
            tone: "green",
            nextStep: "Create the Apex HQ job, then schedule it and assign foreman/crew.",
          }
        : {
            label: "Needs review",
            tone: "amber",
            nextStep: "Resolve the warnings below before creating the job, or confirm the override when prompted.",
          };

  useEffect(() => {
    setDraftForm(normalizeImportedJobDraft(draft));
    setMessage("");
  }, [draft]);

  useEffect(() => {
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "auto" }));
  }, [draft?.id]);

  function updateField(field, value) {
    setDraftForm((current) => normalizeImportedJobDraft({ ...current, [field]: value }));
  }

  function updateListField(field, value) {
    setDraftForm((current) => normalizeImportedJobDraft({ ...current, [field]: value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean) }));
  }

  function updateCustomerMatch(patch) {
    setDraftForm((current) => normalizeImportedJobDraft({
      ...current,
      ...patch,
      customerMatchReviewedAt: patch.customerMatchStatus ? new Date().toISOString() : current.customerMatchReviewedAt,
    }));
  }

  async function saveDraft(event) {
    event.preventDefault();
    if (!canManageDraft) {
      setMessage("Saving imported drafts is only available to office roles that manage job draft imports.");
      return;
    }
    try {
      const result = await onSaveDraft(draftForm);
      setMessage(result?.message || "Save did not complete. Check your role access and try again.");
    } catch (error) {
      setMessage(error?.message || "Could not save this imported draft. Review the package and try again.");
    }
  }

  async function createJob() {
    if (!canCreateJob) {
      setMessage("Creating jobs from imported drafts is only available to office roles with job creation access.");
      return;
    }
    try {
      const result = await onCreateJobFromDraft(draftForm);
      setMessage(result?.message || "Job creation did not complete. Check readiness and role access, then try again.");
    } catch (error) {
      setMessage(error?.message || "Could not create this Apex HQ job. Review readiness and try again.");
    }
  }

  async function copySummary() {
    await navigator.clipboard.writeText(formatImportedDraftSummary(draftForm));
    setMessage("Startup summary copied.");
  }

  return (
    <form className="co-office-page co-imports-page co-import-detail-page" onSubmit={saveDraft}>
      <PageHeader
        eyebrow="Imported Job Draft"
        title={draftForm.jobName || "Untitled imported draft"}
        description="Review the direct-send draft, confirm the customer match, then create the real Apex HQ job when the office is ready."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={onBack}>Back to drafts</Button>
            {draftForm.createdJobId ? (
              <Button type="button" onClick={() => onOpenCreatedJob(draftForm.createdJobId)}>Open Created Job</Button>
            ) : (
              <Button type="button" onClick={createJob} disabled={busy || !canCreateJob}>{canCreateJob ? "Create Apex HQ Job" : "Create Restricted"}</Button>
            )}
            <Button type="submit" variant="secondary" disabled={busy || !canManageDraft}>{canManageDraft ? "Save Imported Draft" : "Read Only"}</Button>
          </div>
        }
      />
      <div className="co-import-detail-layout grid min-w-0 gap-4 px-5 sm:px-6 lg:grid-cols-[1fr_360px] lg:items-start lg:px-8">
        <div className="min-w-0 space-y-4">
          {message ? <div className="rounded-2xl border border-green-100 bg-green-50 px-4 py-3 text-sm font-bold text-green-800">{message}</div> : null}
          <Card className="p-5">
            <SectionHeader
              title="Draft status and next step"
              description="Use this checkpoint to decide whether the draft is ready to become a real job."
              action={<Badge tone={workflowState.tone}>{workflowState.label}</Badge>}
            />
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Import status</p>
                <div className="mt-2"><Badge tone={importedDraftStatusTone(draftForm.importStatus)}>{draftForm.importStatus}</Badge></div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Customer match</p>
                <div className="mt-2"><Badge tone={customerMatchStatusTone(draftForm.customerMatchStatus)}>{draftForm.customerMatchStatus}</Badge></div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Readiness</p>
                <p className="mt-2 text-sm font-black text-slate-800">{draftForm.opsReadinessLabel || "Needs review"}{draftForm.opsReadinessScore !== "" ? ` (${draftForm.opsReadinessScore})` : ""}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Created job</p>
                <p className="mt-2 text-sm font-black text-slate-800">{draftForm.createdJobId ? "Created" : "Not created yet"}</p>
              </div>
            </div>
            <p className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold leading-6 text-blue-900">{workflowState.nextStep}</p>
          </Card>
          <ImportedDraftCustomerMatchCard
            draft={draftForm}
            customers={customers}
            warnings={customerMatchWarnings}
            onUpdate={updateCustomerMatch}
          />
          {warnings.length > 0 ? (
            <Card className="border-amber-200 bg-amber-50 p-5">
              <SectionHeader title="Needs review before field work" description="Imported packages can be saved even when some details need office review." />
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm font-bold text-amber-800">
                {warnings.map((warning) => <li key={warning}>{warning}</li>)}
              </ul>
            </Card>
          ) : null}
          <Card className="p-5">
            <SectionHeader title="Imported customer and job location" description="Clean up customer, contact, address, city, and state before creating the real job." />
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <InputField label="Customer name" value={draftForm.customerName} onChange={(event) => updateField("customerName", event.target.value)} />
              <InputField label="Job name" value={draftForm.jobName} onChange={(event) => updateField("jobName", event.target.value)} />
              <InputField label="Contact name" value={draftForm.contactName} onChange={(event) => updateField("contactName", event.target.value)} />
              <InputField label="Contact email" type="email" value={draftForm.contactEmail} onChange={(event) => updateField("contactEmail", event.target.value)} />
              <InputField label="Contact phone" value={draftForm.contactPhone} onChange={(event) => updateField("contactPhone", event.target.value)} />
              <InputField label="Job address" value={draftForm.jobAddress} onChange={(event) => updateField("jobAddress", event.target.value)} />
              <InputField label="City" value={draftForm.city} onChange={(event) => updateField("city", event.target.value)} />
              <InputField label="State" value={draftForm.state} onChange={(event) => updateField("state", event.target.value.toUpperCase().slice(0, 2))} />
            </div>
          </Card>
          <Card className="p-5">
            <SectionHeader title="Scope and notes" description="Customer scope becomes job scope. Exclusions, assumptions, operations notes, and readiness items stay in office job notes." />
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <InputField label="Service type" value={draftForm.serviceType} onChange={(event) => updateField("serviceType", event.target.value)} />
              <InputField label="Project type" value={draftForm.projectType} onChange={(event) => updateField("projectType", event.target.value)} />
              <div className="md:col-span-2">
                <TextAreaField label="Scope summary" value={draftForm.scopeSummary} onChange={(event) => updateField("scopeSummary", event.target.value)} />
              </div>
              <TextAreaField label="Included scope (one per line)" value={draftForm.includedScope.join("\n")} onChange={(event) => updateListField("includedScope", event.target.value)} />
              <TextAreaField label="Exclusions (one per line)" value={draftForm.exclusions.join("\n")} onChange={(event) => updateListField("exclusions", event.target.value)} />
              <TextAreaField label="Assumptions (one per line)" value={draftForm.assumptions.join("\n")} onChange={(event) => updateListField("assumptions", event.target.value)} />
              <TextAreaField label="Operations notes" value={draftForm.operationsNotes} onChange={(event) => updateField("operationsNotes", event.target.value)} />
              <TextAreaField label="Crew / field notes" value={draftForm.crewNotes} onChange={(event) => updateField("crewNotes", event.target.value)} />
              <TextAreaField label="Schedule notes" value={draftForm.scheduleNotes} onChange={(event) => updateField("scheduleNotes", event.target.value)} />
            </div>
          </Card>
          <Card className="p-5">
            <SectionHeader title="Readiness and references" description="These notes help the office decide whether the imported draft is safe to create as a real job." />
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <SelectField label="Import status" value={draftForm.importStatus} onChange={(event) => updateField("importStatus", event.target.value)}>
                {IMPORTED_JOB_DRAFT_STATUSES.map((status) => <option key={status}>{status}</option>)}
              </SelectField>
              <InputField label="Start date target" type="date" value={draftForm.startDateTarget} onChange={(event) => updateField("startDateTarget", event.target.value)} />
              <InputField label="Assigned crew placeholder" value={draftForm.assignedCrewPlaceholder} onChange={(event) => updateField("assignedCrewPlaceholder", event.target.value)} />
              <InputField label="Foreman placeholder" value={draftForm.foremanPlaceholder} onChange={(event) => updateField("foremanPlaceholder", event.target.value)} />
              <InputField label="Readiness label" value={draftForm.opsReadinessLabel} onChange={(event) => updateField("opsReadinessLabel", event.target.value)} />
              <InputField label="Readiness score" value={draftForm.opsReadinessScore} onChange={(event) => updateField("opsReadinessScore", event.target.value)} />
              <InputField label="Proposal amount" value={draftForm.proposalAmount} onChange={(event) => updateField("proposalAmount", event.target.value)} />
              <InputField label="Proposal link / ID" value={draftForm.proposalLinkOrId} onChange={(event) => updateField("proposalLinkOrId", event.target.value)} />
              <div className="md:col-span-2">
                <TextAreaField label="Readiness issues (one per line)" value={draftForm.opsReadinessIssues.join("\n")} onChange={(event) => updateListField("opsReadinessIssues", event.target.value)} />
              </div>
              <div className="md:col-span-2">
                <TextAreaField label="Job draft summary" value={draftForm.jobDraftSummary} onChange={(event) => updateField("jobDraftSummary", event.target.value)} />
              </div>
            </div>
          </Card>
        </div>
        <div className="co-import-detail-rail min-w-0 space-y-4 lg:sticky lg:top-20">
          <Card className="p-5">
            <SectionHeader title="Create job readiness" description={workflowState.nextStep} />
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge tone={workflowState.tone}>{workflowState.label}</Badge>
                <Badge tone={customerMatchStatusTone(draftForm.customerMatchStatus)}>{draftForm.customerMatchStatus}</Badge>
              </div>
              <p className="text-sm leading-6 text-slate-600">Imported drafts stay as review records until the office creates the Apex HQ job.</p>
              {customerMatchNeedsReview ? (
                <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold leading-6 text-amber-800">Customer match must be confirmed or set to create a new customer before job creation can continue.</p>
              ) : null}
              {createdJob ? <p className="rounded-2xl bg-green-50 p-3 text-sm font-bold text-green-800">Created job: {jobTitle(createdJob)}</p> : null}
              <div className="grid gap-2">
                {draftForm.createdJobId ? (
                  <Button className="w-full" type="button" onClick={() => onOpenCreatedJob(draftForm.createdJobId)}>Open Created Job</Button>
                ) : (
                  <Button className="w-full" type="button" onClick={createJob} disabled={busy || !canCreateJob}>{canCreateJob ? "Create Apex HQ Job" : "Create Restricted"}</Button>
                )}
                <Button className="w-full" type="submit" variant="secondary" disabled={busy || !canManageDraft}>{canManageDraft ? "Save Imported Draft" : "Read Only"}</Button>
                <Button className="w-full" type="button" variant="ghost" onClick={copySummary}>Copy Startup Summary</Button>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <SectionHeader title="Source references" />
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <p><span className="font-black text-slate-800">Draft ID:</span> {draftForm.opsJobDraftId || "Not provided"}</p>
              <p><span className="font-black text-slate-800">Handoff ID:</span> {draftForm.sourceHandoffId || "Not provided"}</p>
              <p><span className="font-black text-slate-800">Proposal ID:</span> {draftForm.sourceProposalId || draftForm.proposalLinkOrId || "Not provided"}</p>
              <p><span className="font-black text-slate-800">Estimate ID:</span> {draftForm.sourceEstimateId || "Not provided"}</p>
              <p><span className="font-black text-slate-800">Packet ID:</span> {draftForm.sourcePacketId || "Not provided"}</p>
            </div>
          </Card>
        </div>
      </div>
    </form>
  );
}
