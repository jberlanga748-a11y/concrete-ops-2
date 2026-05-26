import { useEffect, useMemo, useRef, useState } from "react";

import {
  ApexOfficeCommandShell,
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
import { jobScheduleLabel, jobTitle } from "./job-utils";
import { DailyReportMobileAccordionCard, DailyReportMobileCard, DailyReportMobileFieldGroup, DailyReportStatusBadge, DailyReportsTable } from "./report-route-components";
import {
  buildDailyReportsSupportContext,
  dailyReportConcreteSummary,
  dailyReportDateKey,
  dailyReportIsLiveJob,
  dailyReportNeedsAction,
  dailyReportNeedsReview,
  dailyReportPrimaryNote,
  dailyReportProofSummary,
  deriveAdvancedReportSummary,
  deriveDailyReportListState,
  deriveDailyReportProofState,
  filterDailyReports,
  normalizeObjectArray,
  reportStatusLabel,
  todayDateInputValue,
} from "./report-utils";
import { formatMinutes } from "./time-utils";

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

function TimestampMeta({ createdAt, updatedAt }) {
  return (
    <div className="grid gap-2 rounded-2xl border border-blue-100 bg-blue-50/60 p-3 text-xs text-slate-600 md:grid-cols-2">
      <div>
        <p className="font-black uppercase tracking-[0.14em] text-slate-400">Created</p>
        <p className="mt-1 font-bold text-slate-700">{formatDateTime(createdAt)}</p>
      </div>
      <div>
        <p className="font-black uppercase tracking-[0.14em] text-slate-400">Last updated</p>
        <p className="mt-1 font-bold text-slate-700">{formatDateTime(updatedAt)}</p>
      </div>
    </div>
  );
}

function DailyReportProofChecklist({ proofState }) {
  if (!proofState) return null;

  const items = [
    { label: "Work notes", state: proofState.missingCore.includes("Work notes") ? "needs" : "ready", value: proofState.missingCore.includes("Work notes") ? "Needed" : "Set" },
    { label: "Crew summary", state: proofState.missingCore.includes("Crew summary") ? "needs" : "ready", value: proofState.missingCore.includes("Crew summary") ? "Needed" : "Set" },
    { label: "Weather", state: proofState.missingCore.includes("Weather") ? "needs" : "ready", value: proofState.missingCore.includes("Weather") ? "Needed" : "Set" },
    { label: "Photos", state: proofState.photoMissing ? "needs" : "ready", value: proofState.photoMissing ? "Missing" : `${proofState.photoCount} linked` },
    { label: "Delivery ticket", state: proofState.ticketMissing ? "needs" : "ready", value: proofState.ticketExpected ? `${proofState.ticketCount} linked` : "If pour" },
    { label: "Checklists", state: proofState.openChecklistCount ? "needs" : "ready", value: proofState.openChecklistCount ? `${proofState.openChecklistCount} open` : "Clear" },
  ];

  return (
    <div className="co-reports-proof-checklist">
      {items.map((item) => (
        <span key={item.label} data-state={item.state}>
          {item.label}
          <strong>{item.value}</strong>
        </span>
      ))}
    </div>
  );
}

function DailyReportsOperationsBoard({
  isFieldReportWorkspace,
  canCreate,
  canReview,
  permissions,
  operatingDate,
  fieldFocusJob,
  fieldFocusReport,
  fieldFocusProof,
  visibleRows,
  missingReportJobs,
  proofGapReports,
  submittedCount,
  needsActionCount,
  onStartReportForJob,
  onOpenReport,
  onOpenReportTool,
  onSetFilter,
  onSetDateFilter,
  onOpenModule,
  proofStateByReportId,
}) {
  const reviewReports = visibleRows.filter(dailyReportNeedsReview).slice(0, 3);
  const draftReports = visibleRows.filter(dailyReportNeedsAction).slice(0, 3);
  const evidenceGapReports = proofGapReports.slice(0, 3);
  const boardDateLabel = operatingDate || "Today";

  if (isFieldReportWorkspace) {
    const focusTitle = fieldFocusJob ? jobTitle(fieldFocusJob) : "No assigned job visible";
    const reportStatus = fieldFocusReport ? reportStatusLabel(fieldFocusReport.status) : "Not started";
    const primaryLabel = fieldFocusReport
      ? (dailyReportNeedsAction(fieldFocusReport) ? "Continue report" : "Open report")
      : "Start report";

    return (
      <div className="co-reports-ops-board mx-auto w-full max-w-[1520px] min-w-0 px-5 pb-3 sm:px-6 lg:px-6" data-mode="field">
        <Card className="co-reports-ops-card overflow-hidden">
          <div className="co-reports-ops-field-main">
            <div className="min-w-0">
              <p className="co-reports-ops-eyebrow">Today&apos;s field closeout</p>
              <h2>{focusTitle}</h2>
              <p>{fieldFocusJob ? `${jobScheduleLabel(fieldFocusJob)} / ${reportStatus}` : "Select an assigned job before starting field paperwork."}</p>
            </div>
            <div className="co-reports-ops-actions">
              {fieldFocusReport ? (
                <Button type="button" onClick={() => onOpenReport(fieldFocusReport)}>{primaryLabel}</Button>
              ) : (
                <Button type="button" onClick={() => onStartReportForJob(fieldFocusJob)} disabled={!canCreate || !fieldFocusJob}>{primaryLabel}</Button>
              )}
              {permissions?.uploads?.canView ? <Button type="button" variant="secondary" onClick={() => onOpenModule("uploads")}>Upload photos</Button> : null}
            </div>
          </div>
          <DailyReportProofChecklist proofState={fieldFocusProof} />
          <div className="co-reports-quick-action-row">
            {permissions?.time?.canView ? <button type="button" onClick={() => onOpenModule("time")}><Icon name="clock" />Clock</button> : null}
            {permissions?.uploads?.canView ? <button type="button" onClick={() => onOpenModule("uploads")}><Icon name="upload" />Photos</button> : null}
            {permissions?.deliveryTickets?.canView ? <button type="button" onClick={() => onOpenModule("deliveryTickets")}><Icon name="clipboard" />Tickets</button> : null}
            {permissions?.prePour?.canView ? <button type="button" onClick={() => onOpenModule("prePour")}><Icon name="clipboard" />Pre-Pour</button> : null}
            {permissions?.postPour?.canView ? <button type="button" onClick={() => onOpenModule("postPour")}><Icon name="clipboard" />Post-Pour</button> : null}
            {permissions?.toolChecklist?.canUse ? <button type="button" onClick={() => onOpenModule("toolChecklist")}><Icon name="hardhat" />Tools</button> : null}
          </div>
        </Card>
      </div>
    );
  }

  const reviewTiles = [
    {
      label: "Missing today",
      value: missingReportJobs.length,
      helper: `${boardDateLabel} job reports not started`,
      tone: missingReportJobs.length ? "amber" : "green",
      action: "View jobs",
      onClick: () => {
        onSetDateFilter(operatingDate);
        onSetFilter("All");
      },
    },
    {
      label: "Drafts open",
      value: needsActionCount,
      helper: "Field reports not submitted",
      tone: needsActionCount ? "orange" : "green",
      action: "Open drafts",
      onClick: () => onSetFilter("Draft"),
    },
    {
      label: "Needs review",
      value: submittedCount,
      helper: "Submitted for office closeout",
      tone: submittedCount ? "orange" : "green",
      action: canReview ? "Review" : "View",
      onClick: () => onSetFilter("Submitted"),
    },
    {
      label: "Proof gaps",
      value: proofGapReports.length,
      helper: "Missing notes, photos, tickets, or checklists",
      tone: proofGapReports.length ? "amber" : "green",
      action: "Find gaps",
      onClick: () => {
        const target = proofGapReports[0];
        if (target) onOpenReport(target);
      },
    },
  ];
  const closeoutPriorityItems = [
    {
      label: "Missing reports",
      value: missingReportJobs.length,
      helper: `${boardDateLabel} jobs without a report`,
      tone: missingReportJobs.length ? "orange" : "green",
      action: missingReportJobs.length ? "Open missing" : "Clear",
      onClick: () => {
        onSetDateFilter(operatingDate);
        onSetFilter("All");
      },
    },
    {
      label: "Review queue",
      value: submittedCount,
      helper: "Submitted for office signoff",
      tone: submittedCount ? "orange" : "green",
      action: canReview ? "Review" : "View",
      onClick: () => onSetFilter("Submitted"),
    },
    {
      label: "Proof gaps",
      value: proofGapReports.length,
      helper: "Photos, tickets, notes, or checklists",
      tone: proofGapReports.length ? "amber" : "green",
      action: proofGapReports.length ? "Inspect" : "Clear",
      onClick: () => {
        const target = proofGapReports[0];
        if (target) onOpenReport(target);
      },
    },
    {
      label: "Drafts open",
      value: needsActionCount,
      helper: "Field reports still in progress",
      tone: needsActionCount ? "amber" : "green",
      action: needsActionCount ? "Open drafts" : "Clear",
      onClick: () => onSetFilter("Draft"),
    },
  ];
  const closeoutNextAction = proofGapReports.length
    ? "Inspect the first proof gap"
    : submittedCount
      ? "Review submitted reports"
      : missingReportJobs.length
        ? "Start the next missing report"
        : needsActionCount
          ? "Open field drafts"
          : "Closeout board is clear";
  const closeoutNextDetail = proofGapReports.length
    ? dailyReportProofSummary(proofStateByReportId.get(proofGapReports[0].id))
    : submittedCount
      ? `${submittedCount} report${submittedCount === 1 ? "" : "s"} waiting on office signoff`
      : missingReportJobs.length
        ? `${missingReportJobs.length} job${missingReportJobs.length === 1 ? "" : "s"} missing ${boardDateLabel} reports`
        : needsActionCount
          ? `${needsActionCount} draft${needsActionCount === 1 ? "" : "s"} still open`
          : "Nothing urgent in the current view.";
  const focusReport = evidenceGapReports[0] || reviewReports[0] || draftReports[0] || visibleRows[0] || null;
  const focusProof = focusReport ? proofStateByReportId.get(focusReport.id) : null;
  const focusQueue = [
    ...missingReportJobs.slice(0, 2).map((job) => ({ type: "missing", job })),
    ...reviewReports.map((report) => ({ type: "review", report })),
    ...evidenceGapReports.map((report) => ({ type: "proof", report })),
  ].slice(0, 6);
  const focusProofBadges = focusProof ? [
    { label: "Photos", value: focusProof.photoMissing ? "Missing" : `${focusProof.photoCount} linked`, state: focusProof.photoMissing ? "needs" : "ready" },
    { label: "Ticket", value: focusProof.ticketMissing ? "Missing" : focusProof.ticketExpected ? `${focusProof.ticketCount} linked` : "If pour", state: focusProof.ticketMissing ? "needs" : "ready" },
    { label: "Checklists", value: focusProof.openChecklistCount ? `${focusProof.openChecklistCount} open` : "Clear", state: focusProof.openChecklistCount ? "needs" : "ready" },
    { label: "Basics", value: focusProof.missingCore?.length ? `${focusProof.missingCore.length} missing` : "Ready", state: focusProof.missingCore?.length ? "needs" : "ready" },
  ] : [];

  return (
    <CommandPageFrame
      className="co-proof-engine-frame co-reports-proof-frame"
      kpis={
        <div className="co-proof-engine-kpis">
          {reviewTiles.map((tile) => (
            <button key={tile.label} type="button" className="co-proof-engine-kpi" data-tone={tile.tone} onClick={tile.onClick}>
              <span>{tile.label}</span>
              <strong>{tile.value}</strong>
              <em>{tile.helper}</em>
              <b>{tile.action}</b>
            </button>
          ))}
        </div>
      }
      rail={
        <AssistantRail
          eyebrow="Apex Assistant"
          title="Closeout"
          description={`${closeoutNextAction}. ${closeoutNextDetail}`}
          priorities={closeoutPriorityItems.map((item) => ({ value: item.value, label: item.label, tone: item.tone }))}
          actions={[
            canCreate ? { label: "Start report", icon: "plus", onClick: () => onOpenReportTool("create") } : null,
            { label: canReview ? "Review submitted" : "View submitted", icon: "check", onClick: () => onSetFilter("Submitted") },
            { label: "Open uploads", icon: "upload", onClick: () => onOpenModule("uploads"), disabled: !permissions?.uploads?.canView },
          ].filter(Boolean)}
        />
      }
    >
      <section className="co-proof-engine-workbench" aria-label="Daily report proof engine">
        <div className="co-proof-engine-head">
          <div className="min-w-0">
            <p className="co-proof-engine-eyebrow">Daily closeout command</p>
            <h2>Reports, proof, blockers, and billing readiness</h2>
            <p>Office review starts with what field submitted, what proof is missing, and which job can move toward ready-to-bill.</p>
          </div>
          <div className="co-proof-engine-actions">
            {canCreate ? <Button type="button" onClick={() => onOpenReportTool("create")}>Start report</Button> : null}
            <Button type="button" variant="secondary" onClick={() => onSetFilter("Submitted")}>Review queue</Button>
          </div>
        </div>
        <div className="co-proof-engine-board">
          <div className="co-proof-engine-queue">
            <div className="co-proof-engine-section-head">
              <span>Proof review queue</span>
              <strong>{focusQueue.length || "Clear"}</strong>
            </div>
            {focusQueue.length ? focusQueue.map((item) => {
              if (item.type === "missing") {
                return (
                  <WorkQueueCard
                    key={`missing-${item.job.id}`}
                    eyebrow="Missing report"
                    title={jobTitle(item.job)}
                    meta={jobScheduleLabel(item.job)}
                    status="Not started"
                    tone="amber"
                    actionLabel={canCreate ? "Start report" : "View job"}
                    onClick={() => onStartReportForJob(item.job)}
                  >
                    <div className="co-proof-engine-row-meta">
                      <span>Job</span>
                      <span>Field closeout missing</span>
                      <span>Blocks billing proof</span>
                    </div>
                  </WorkQueueCard>
                );
              }

              const proof = proofStateByReportId.get(item.report.id);
              const tone = item.type === "proof" ? "amber" : dailyReportNeedsReview(item.report) ? "orange" : "green";
              return (
                <WorkQueueCard
                  key={`${item.type}-${item.report.id}`}
                  eyebrow={item.type === "proof" ? "Proof gap" : "Needs review"}
                  title={jobTitle(item.report.job)}
                  meta={`${item.report.reportDate} / ${item.report.createdByName || "Field crew"}`}
                  status={reportStatusLabel(item.report.status)}
                  tone={tone}
                  actionLabel="Open report"
                  selected={focusReport?.id === item.report.id}
                  onClick={() => onOpenReport(item.report)}
                >
                  <div className="co-proof-engine-row-meta">
                    <span>{dailyReportProofSummary(proof)}</span>
                    <span>{dailyReportConcreteSummary(item.report)}</span>
                    <span>{dailyReportPrimaryNote(item.report) || "No note"}</span>
                  </div>
                </WorkQueueCard>
              );
            }) : (
              <div className="co-proof-engine-empty">
                <strong>Closeout queue is clear</strong>
                <span>Visible jobs have no urgent report or proof blockers.</span>
              </div>
            )}
          </div>
          <div className="co-proof-engine-detail">
            <div className="co-proof-engine-section-head">
              <span>Selected proof packet</span>
              <strong>{focusReport ? reportStatusLabel(focusReport.status) : "Ready"}</strong>
            </div>
            {focusReport ? (
              <>
                <div className="co-proof-engine-detail-title">
                  <div className="min-w-0">
                    <h3>{jobTitle(focusReport.job)}</h3>
                    <p>{focusReport.reportDate} / {focusReport.createdByName || "Field crew"} / {dailyReportConcreteSummary(focusReport)}</p>
                  </div>
                  <DailyReportStatusBadge status={focusReport.status} />
                </div>
                <p className="co-proof-engine-note">{dailyReportPrimaryNote(focusReport) || "No field note has been added yet."}</p>
                <DailyReportProofChecklist proofState={focusProof} />
                <div className="co-proof-engine-proof-grid">
                  {focusProofBadges.map((item) => (
                    <span key={item.label} data-state={item.state}>
                      {item.label}
                      <strong>{item.value}</strong>
                    </span>
                  ))}
                </div>
                <div className="co-proof-engine-next">
                  <span>Next action</span>
                  <strong>{closeoutNextAction}</strong>
                  <p>{closeoutNextDetail}</p>
                </div>
              </>
            ) : (
              <div className="co-proof-engine-empty">
                <strong>No report selected</strong>
                <span>Start with a missing report, submitted report, or proof gap.</span>
              </div>
            )}
          </div>
        </div>
      </section>
    </CommandPageFrame>
  );
}

function AdvancedReportsPrepPanel({ summary, onSetFilter, onOpenModule, onOpenReport }) {
  if (!summary) return null;

  const prepCards = [
    {
      label: "Needs attention",
      value: summary.needsAttention,
      helper: "Drafts, submitted reports, proof gaps, or missing basics",
      icon: "alert",
      tone: summary.needsAttention ? "amber" : "green",
      actionLabel: summary.needsAttention ? "Open queue" : "Clear",
      onAction: () => onSetFilter?.(summary.submittedForReview ? "Submitted" : summary.fieldDrafts ? "Draft" : "All"),
      disabled: !summary.needsAttention,
    },
    {
      label: "Closeout ready",
      value: summary.closeoutReady,
      displayValue: `${summary.closeoutReadyRate || 0}%`,
      helper: `${summary.closeoutReady} reviewed report${summary.closeoutReady === 1 ? "" : "s"} with proof clear`,
      icon: "check",
      tone: summary.closeoutReady ? "green" : "slate",
      actionLabel: "View reviewed",
      onAction: () => onSetFilter?.("Reviewed"),
    },
    {
      label: "Proof gaps",
      value: summary.proofGaps,
      helper: "Reports missing photos, tickets, checklists, or core fields",
      icon: "upload",
      tone: summary.proofGaps ? "orange" : "green",
      actionLabel: summary.proofGaps ? "Find gaps" : "No gaps",
      onAction: () => onSetFilter?.("All"),
      disabled: !summary.proofGaps,
    },
    {
      label: "Field signals",
      value: summary.reportsWithDelays + summary.reportsWithSafetyNotes,
      displayValue: `${summary.reportsWithDelays}/${summary.reportsWithSafetyNotes}`,
      helper: "Delay reports / safety-note reports",
      icon: "document",
      tone: summary.reportsWithDelays || summary.reportsWithSafetyNotes ? "amber" : "blue",
      actionLabel: "Review signals",
      onAction: () => onSetFilter?.("All"),
    },
  ];

  const readinessChecks = [
    `${summary.totalReports} report${summary.totalReports === 1 ? "" : "s"} in ${summary.dateRangeLabel}`,
    `${summary.closeoutReady} closeout-ready report${summary.closeoutReady === 1 ? "" : "s"}`,
    `${summary.proofGaps} report${summary.proofGaps === 1 ? "" : "s"} with proof gaps`,
    `${summary.missingBasics} report${summary.missingBasics === 1 ? "" : "s"} missing basics`,
  ];
  const fieldSignals = [
    `${summary.submittedForReview} submitted report${summary.submittedForReview === 1 ? "" : "s"} waiting on office review`,
    `${summary.fieldDrafts} draft or reopened report${summary.fieldDrafts === 1 ? "" : "s"} still in field completion`,
    `${summary.concreteReports} concrete report${summary.concreteReports === 1 ? "" : "s"} / ${summary.concreteYards} yd poured`,
    `${summary.reportsWithDelays} delay note${summary.reportsWithDelays === 1 ? "" : "s"} and ${summary.reportsWithSafetyNotes} safety note${summary.reportsWithSafetyNotes === 1 ? "" : "s"}`,
  ];

  return (
    <div className="co-reports-advanced-panel mx-auto w-full max-w-[1520px] min-w-0 px-5 pb-3 sm:px-6 lg:px-6">
      <Card className="co-reports-advanced-card overflow-hidden">
        <div className="co-reports-advanced-head">
          <div className="min-w-0">
            <p className="co-reports-ops-eyebrow">Advanced reporting prep</p>
            <h2>Owner reporting signals before job costing gets heavier</h2>
            <p>This is a read-only reporting layer for office review. Field users do not see this panel.</p>
          </div>
          <Badge tone="orange">Premium reporting</Badge>
        </div>
        <div className="co-reports-advanced-grid">
          {prepCards.map((item) => <CommandCenterKpiCard key={item.label} item={item} />)}
        </div>
        <div className="co-reports-advanced-breakdowns">
          <div>
            <span>Top jobs in this report view</span>
            {summary.topJobs.length ? summary.topJobs.map((item) => (
              <p key={item.key}><strong>{item.label}</strong><em>{item.count}</em></p>
            )) : <p><strong>No job report volume yet</strong><em>0</em></p>}
          </div>
          <div>
            <span>Reporter volume</span>
            {summary.topCreators.length ? summary.topCreators.map((item) => (
              <p key={item.key}><strong>{item.label}</strong><em>{item.count}</em></p>
            )) : <p><strong>No reporter volume yet</strong><em>0</em></p>}
          </div>
          <div>
            <span>Owner review queue</span>
            {summary.reviewQueue.length ? summary.reviewQueue.map((item) => (
              <button key={item.id} type="button" data-tone={item.tone} onClick={() => onOpenReport?.(item)}>
                <strong>{item.label}</strong>
                <small>{item.reason}</small>
                <em>{item.date || "No date"}</em>
              </button>
            )) : <p><strong>No priority report queue in this view</strong><em>Clear</em></p>}
          </div>
          <div>
            <span>Closeout readiness</span>
            {readinessChecks.map((check) => <p key={check}><strong>{check}</strong></p>)}
          </div>
          <div>
            <span>Field signals</span>
            {fieldSignals.map((signal) => <p key={signal}><strong>{signal}</strong></p>)}
          </div>
        </div>
      </Card>
    </div>
  );
}

function DailyReportsTablePolished({ rows, selectedId, onSelect, onOpenDetails, maxRows = 8, proofStateByReportId = new Map() }) {
  const visibleRows = maxRows ? rows.slice(0, maxRows) : rows;

  return (
    <>
      <div className="co-reports-mobile-list-surface md:hidden">
        <div className="co-field-mobile-section-head">
          <span>
            <strong>Visible reports</strong>
            <em>{visibleRows.length} of {rows.length} reports shown</em>
          </span>
          <b>{rows.length}</b>
        </div>
        <div className="co-reports-mobile-list grid gap-3 p-3">
          {visibleRows.map((report) => {
            const selected = report.id === selectedId;
            const proofState = proofStateByReportId.get(report.id);

            return (
              <button
                key={report.id}
                type="button"
                onClick={() => { onSelect(report.id); onOpenDetails?.(); }}
                className={`co-reports-mobile-card co-mobile-record-card co-office-list-card w-full rounded-[1.15rem] border p-4 text-left transition ${selected ? "is-selected border-orange-200 bg-orange-50/70" : "border-slate-200 bg-white hover:border-orange-200 hover:bg-orange-50/30"}`}
              >
                <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-lg font-black text-slate-950">{jobTitle(report.job)}</p>
                    <p className="mt-1 break-words text-xs font-bold text-slate-500">{report.reportDate} / {report.createdByName}</p>
                  </div>
                  <div className="shrink-0">
                    <DailyReportStatusBadge status={report.status} />
                  </div>
                </div>
                <p className="mt-3 line-clamp-2 text-sm font-bold leading-5 text-slate-700">{dailyReportPrimaryNote(report)}</p>
                <div className="co-reports-mobile-metrics">
                  <span>Time <strong>{formatMinutes(report.timeSummary?.totalMinutes || 0)}</strong></span>
                  <span>Crew <strong>{report.crewAssignments?.length || 0}</strong></span>
                  <span>Proof <strong>{dailyReportProofSummary(proofState)}</strong></span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <div className="table-shell hidden min-w-0 overflow-x-auto md:block">
        <table className="co-reports-command-table w-full min-w-[840px] text-left">
          <thead>
            <tr>
              <th>Job / Report</th>
              <th>Status</th>
              <th>Date</th>
              <th>Crew / Time</th>
              <th>Field Notes</th>
              <th>Proof</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((report) => {
              const selected = report.id === selectedId;
              const proofState = proofStateByReportId.get(report.id);

              return (
                <tr key={report.id} onClick={() => onSelect(report.id)} className={`cursor-pointer transition hover:bg-orange-50/45 ${selected ? "bg-orange-50/70" : ""}`}>
                  <td>
                    <p className="font-black text-slate-950">{jobTitle(report.job)}</p>
                    <p className="text-xs font-bold text-slate-500">{report.id} / {report.createdByName}</p>
                  </td>
                  <td><DailyReportStatusBadge status={report.status} /></td>
                  <td className="font-bold text-slate-700">{report.reportDate}</td>
                  <td>
                    <p className="font-bold text-slate-700">{report.crewAssignments?.length || 0} assigned</p>
                    <p className="text-xs font-bold text-slate-500">{formatMinutes(report.timeSummary?.totalMinutes || 0)} worked</p>
                  </td>
                  <td>
                    <p className="font-bold text-slate-700">{dailyReportPrimaryNote(report)}</p>
                    <p className="text-xs font-bold text-slate-500">{report.weather || "Weather not set"}</p>
                  </td>
                  <td>
                    <p className="font-bold text-slate-700">{dailyReportProofSummary(proofState)}</p>
                    <p className="text-xs font-bold text-slate-500">{dailyReportConcreteSummary(report)}</p>
                  </td>
                  <td>
                    <div className="flex justify-end gap-1">
                      <button type="button" className="co-reports-icon-button" onClick={(event) => { event.stopPropagation(); onSelect(report.id); onOpenDetails?.(); }} aria-label={`Open report ${report.id}`}>
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

function DailyReportCreateCard({ draft, setDraft, onCreate, disabled, canCreate, jobs }) {
  if (!canCreate) {
    return (
      <Card className="p-5">
        <SectionHeader title="New report" description="Only foremen and office roles can create official daily reports." />
        <StateCard title="Read-only access" description="You can review field reports here, but only approved field or office roles can create them." tone="slate" />
      </Card>
    );
  }

  const selectedJob = jobs.find((job) => job.id === draft.jobId);
  const createSummary = selectedJob ? `${jobTitle(selectedJob)} / ${draft.reportDate || "date pending"}` : "select job and report date";
  const selectedJobLabel = selectedJob ? jobTitle(selectedJob) : "Select a job";
  const reportDateLabel = draft.reportDate || "Date pending";
  const requiredReadyCount = [draft.jobId, draft.reportDate].filter(Boolean).length;
  const noteCount = [draft.workPerformed, draft.crewSummary, draft.weather, draft.materialNotes, draft.delays, draft.safetyNotes, draft.equipmentUsed, draft.visitorNotes, draft.inspectionNotes, draft.generalNotes].filter(Boolean).length;
  const pourLabel = draft.concretePoured ? `${Number(draft.yardsPoured || 0)} yd${Number(draft.yardsPoured || 0) === 1 ? "" : "s"}` : "No pour marked";
  const requiredSummary = requiredReadyCount === 2 ? "Ready to start" : `${2 - requiredReadyCount} required field${2 - requiredReadyCount === 1 ? "" : "s"} left`;
  const notesSummary = noteCount ? `${noteCount} note area${noteCount === 1 ? "" : "s"} started` : "Notes optional";
  const canStartReport = Boolean(draft.jobId && draft.reportDate);

  return (
    <>
      <DailyReportMobileAccordionCard title="Start Field Report" summary={createSummary} badge={<Badge tone="orange">New</Badge>} defaultOpen>
        <form className="co-reports-create-mobile-form grid gap-3" onSubmit={onCreate}>
          <div className="co-reports-create-target">
            <span>Report target</span>
            <strong>{selectedJobLabel}</strong>
            <p>{reportDateLabel}</p>
            <div className="co-reports-create-target-meta">
              <span>{requiredSummary}</span>
              <span>{notesSummary}</span>
              <span>{pourLabel}</span>
            </div>
          </div>
          <DailyReportMobileFieldGroup title="Job / date" summary={createSummary}>
            <SelectField label="Job" value={draft.jobId} onChange={(event) => setDraft((current) => ({ ...current, jobId: event.target.value }))}>
              <option value="">Select a job</option>
              {jobs.map((job) => <option key={job.id} value={job.id}>{jobTitle(job)}</option>)}
            </SelectField>
            <InputField label="Report date" type="date" value={draft.reportDate} onChange={(event) => setDraft((current) => ({ ...current, reportDate: event.target.value }))} />
          </DailyReportMobileFieldGroup>
          <div className="co-reports-create-action-stack co-reports-create-action-stack-mobile">
            <Button type="submit" className="co-reports-create-cta" disabled={disabled || !draft.jobId || !draft.reportDate}>
              <Icon name="plus" />
              Start report now
            </Button>
            <p>Creates the real daily report draft for the selected job and date.</p>
          </div>
          <details className="co-field-mobile-optional-details co-reports-mobile-optional-details">
            <summary>
              <span>
                <strong>Optional details</strong>
                <em>Work, crew, concrete, safety, and notes.</em>
              </span>
              <b aria-hidden="true" />
            </summary>
            <div className="co-field-mobile-optional-body">
              <DailyReportMobileFieldGroup title="Work performed" summary={draft.workPerformed ? "Work notes added" : "Add work completed"}>
                <TextAreaField label="Work performed" value={draft.workPerformed} onChange={(event) => setDraft((current) => ({ ...current, workPerformed: event.target.value }))} placeholder="Prep, pour, formwork, cleanup..." className="field-input min-h-16 resize-y" />
              </DailyReportMobileFieldGroup>
              <DailyReportMobileFieldGroup title="Crew / labor summary" summary={draft.crewSummary ? "Crew summary added" : "Add crew summary"}>
                <TextAreaField label="Crew summary" value={draft.crewSummary} onChange={(event) => setDraft((current) => ({ ...current, crewSummary: event.target.value }))} placeholder="Foreman + 3, finisher + laborer..." className="field-input min-h-16 resize-y" />
              </DailyReportMobileFieldGroup>
              <DailyReportMobileFieldGroup title="Concrete / materials" summary={draft.concretePoured ? `${draft.yardsPoured || 0} yards poured` : "No concrete marked yet"}>
                <InputField label="Weather" value={draft.weather} onChange={(event) => setDraft((current) => ({ ...current, weather: event.target.value }))} />
                <label className="field-label min-h-[60px] justify-center rounded-2xl border border-orange-100 bg-orange-50/60 px-4 py-3">
                  <span>Concrete poured</span>
                  <input type="checkbox" checked={Boolean(draft.concretePoured)} onChange={(event) => setDraft((current) => ({ ...current, concretePoured: event.target.checked, yardsPoured: event.target.checked ? current.yardsPoured : 0 }))} />
                </label>
                {draft.concretePoured ? <InputField label="Yards poured" type="number" min="0" step="0.1" value={draft.yardsPoured} onChange={(event) => setDraft((current) => ({ ...current, yardsPoured: Number(event.target.value) }))} /> : null}
                <TextAreaField label="Material / concrete notes" value={draft.materialNotes} onChange={(event) => setDraft((current) => ({ ...current, materialNotes: event.target.value }))} />
              </DailyReportMobileFieldGroup>
              <DailyReportMobileFieldGroup title="Delays / safety / equipment" summary={[draft.delays, draft.safetyNotes, draft.equipmentUsed].filter(Boolean).length ? "Notes added" : "Optional"}>
                <TextAreaField label="Delays" value={draft.delays} onChange={(event) => setDraft((current) => ({ ...current, delays: event.target.value }))} />
                <TextAreaField label="Safety notes" value={draft.safetyNotes} onChange={(event) => setDraft((current) => ({ ...current, safetyNotes: event.target.value }))} />
                <TextAreaField label="Equipment used" value={draft.equipmentUsed} onChange={(event) => setDraft((current) => ({ ...current, equipmentUsed: event.target.value }))} />
              </DailyReportMobileFieldGroup>
              <DailyReportMobileFieldGroup title="Extra notes" summary={[draft.visitorNotes, draft.inspectionNotes, draft.generalNotes].filter(Boolean).length ? "Notes added" : "Optional"}>
                <TextAreaField label="Visitor notes" value={draft.visitorNotes} onChange={(event) => setDraft((current) => ({ ...current, visitorNotes: event.target.value }))} />
                <TextAreaField label="Inspection notes" value={draft.inspectionNotes} onChange={(event) => setDraft((current) => ({ ...current, inspectionNotes: event.target.value }))} />
                <TextAreaField label="General notes" value={draft.generalNotes} onChange={(event) => setDraft((current) => ({ ...current, generalNotes: event.target.value }))} />
              </DailyReportMobileFieldGroup>
            </div>
          </details>
        </form>
      </DailyReportMobileAccordionCard>
      <Card className="co-reports-create-card hidden overflow-hidden md:block">
        <div className="co-reports-create-header border-b border-slate-200 bg-white p-4">
          <SectionHeader title="Start today's field report" description="Capture crew, work, weather, and pour details while the day is fresh." />
        </div>
        <form className="co-reports-create-form p-4" onSubmit={onCreate}>
          <div className="co-reports-create-target">
            <span>Report target</span>
            <strong>{selectedJobLabel}</strong>
            <p>{reportDateLabel}</p>
            <div className="co-reports-create-target-meta">
              <span>{requiredSummary}</span>
              <span>{notesSummary}</span>
              <span>{pourLabel}</span>
            </div>
          </div>
          <div className="co-reports-create-fields">
            <SelectField label="Job" value={draft.jobId} onChange={(event) => setDraft((current) => ({ ...current, jobId: event.target.value }))}>
              <option value="">Select a job</option>
              {jobs.map((job) => <option key={job.id} value={job.id}>{jobTitle(job)}</option>)}
            </SelectField>
            <InputField label="Report date" type="date" value={draft.reportDate} onChange={(event) => setDraft((current) => ({ ...current, reportDate: event.target.value }))} />
            <div className="co-reports-create-field-wide">
              <TextAreaField label="Crew summary" value={draft.crewSummary} onChange={(event) => setDraft((current) => ({ ...current, crewSummary: event.target.value }))} placeholder="Foreman + 3, finisher + laborer..." className="field-input min-h-16 resize-y" />
            </div>
            <div className="co-reports-create-field-wide">
              <TextAreaField label="Work performed" value={draft.workPerformed} onChange={(event) => setDraft((current) => ({ ...current, workPerformed: event.target.value }))} placeholder="Prep, pour, formwork, cleanup..." className="field-input min-h-16 resize-y" />
            </div>
            <InputField label="Weather" value={draft.weather} onChange={(event) => setDraft((current) => ({ ...current, weather: event.target.value }))} />
            <label className="field-label min-h-[60px] justify-center rounded-2xl border border-orange-100 bg-orange-50/60 px-4 py-3">
              <span>Concrete poured</span>
              <input type="checkbox" checked={Boolean(draft.concretePoured)} onChange={(event) => setDraft((current) => ({ ...current, concretePoured: event.target.checked, yardsPoured: event.target.checked ? current.yardsPoured : 0 }))} />
            </label>
            {draft.concretePoured ? <InputField label="Yards poured" type="number" min="0" step="0.1" value={draft.yardsPoured} onChange={(event) => setDraft((current) => ({ ...current, yardsPoured: Number(event.target.value) }))} /> : null}
          </div>
          <div className="co-reports-create-action-stack">
            <Button type="submit" className="co-reports-create-cta" disabled={disabled || !canStartReport}>
              <Icon name="plus" />
              Start report now
            </Button>
            <p>{canStartReport ? "Opens the real daily report record with the job, date, and field notes you enter here." : "Select a job and report date before starting the daily report."}</p>
            <div className="co-reports-create-checks">
              <span data-state={draft.jobId ? "ready" : "needs"}>Job</span>
              <span data-state={draft.reportDate ? "ready" : "needs"}>Date</span>
              <span data-state={draft.workPerformed || draft.crewSummary || draft.weather ? "ready" : "needs"}>Notes</span>
            </div>
          </div>
        </form>
      </Card>
    </>
  );
}

function DailyReportDetailPanel({
  report,
  proofState,
  reportDraft,
  setReportDraft,
  onSave,
  onSubmit,
  onReview,
  onReopen,
  onArchive,
  canView,
  canEdit,
  canReview,
  canArchive,
  disabled,
  notFound,
  onPrintReport,
}) {
  if (!canView) {
    return (
      <Card className="p-5">
        <SectionHeader title="Report details" description="Daily reports follow role and job visibility rules." />
        <StateCard title="Daily report access unavailable" description="This role cannot open the report workspace right now." tone="slate" />
      </Card>
    );
  }

  if (notFound) {
    return (
      <Card className="p-5">
        <SectionHeader title="Report details" description="The requested report route is not available in your scope." />
        <StateCard title="Daily report not found" description="The report may have been archived, removed from your access scope, or never existed." tone="red" />
      </Card>
    );
  }

  if (!report) {
    return (
      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 bg-white p-5">
          <SectionHeader title="Report details" description="Select a report to review, print, or update field documentation." />
        </div>
        <div className="p-5">
          <div className="rounded-3xl border border-dashed border-orange-200 bg-orange-50/50 p-6">
            <p className="text-sm font-black text-slate-950">No report selected</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">Choose a report from the log, or start a draft above for today's job.</p>
            <div className="mt-4 grid gap-2 text-xs font-bold text-slate-500 sm:grid-cols-3">
              <span className="rounded-2xl bg-white px-3 py-2 text-center shadow-sm">Crew</span>
              <span className="rounded-2xl bg-white px-3 py-2 text-center shadow-sm">Work</span>
              <span className="rounded-2xl bg-white px-3 py-2 text-center shadow-sm">Pour details</span>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  const canEditFieldCloseout = canEdit && ["draft", "reopened"].includes(report.status);
  const reportDateSummary = `${reportDraft.reportDate || report.reportDate} / ${reportDraft.weather || "weather pending"}`;
  const fieldNoteCount = [
    reportDraft.workPerformed,
    reportDraft.crewSummary,
    reportDraft.weather,
    reportDraft.materialNotes,
    reportDraft.delays,
    reportDraft.safetyNotes,
    reportDraft.equipmentUsed,
    reportDraft.visitorNotes,
    reportDraft.inspectionNotes,
    reportDraft.generalNotes,
  ].filter(Boolean).length;
  const closeoutSummary = canEditFieldCloseout
    ? `${fieldNoteCount} field${fieldNoteCount === 1 ? "" : "s"} set / ${dailyReportConcreteSummary(reportDraft)}`
    : `${reportStatusLabel(report.status)} / ${dailyReportProofSummary(proofState)}`;

  return (
    <div className="min-w-0 space-y-4">
      <div className="space-y-3 md:hidden">
        <Card className="co-mobile-detail-card co-reports-mobile-closeout-card p-3.5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="break-words text-base font-black text-slate-950">{jobTitle(report.job)}</p>
              <p className="mt-1 break-words text-xs font-bold text-slate-500">{`${report.reportDate} / ${report.createdByName}`}</p>
            </div>
            <DailyReportStatusBadge status={report.status} />
          </div>
          <div className="co-reports-mobile-closeout-actions mt-3 flex flex-wrap gap-2">
            {canView ? <Button variant="secondary" size="sm" onClick={onPrintReport} disabled={disabled || typeof onPrintReport !== "function"}>Print</Button> : null}
            {canEdit && ["draft", "reopened"].includes(report.status) ? <Button size="sm" onClick={onSave} disabled={disabled}>Save</Button> : null}
            {canEdit && ["draft", "reopened"].includes(report.status) ? <Button variant="secondary" size="sm" onClick={onSubmit} disabled={disabled}>Submit</Button> : null}
            {canReview && ["submitted", "reopened"].includes(report.status) ? <Button variant="secondary" size="sm" onClick={onReview} disabled={disabled}>Review</Button> : null}
            {canReview && ["submitted", "reviewed"].includes(report.status) ? <Button variant="secondary" size="sm" onClick={onReopen} disabled={disabled}>Reopen</Button> : null}
            {canArchive && !report.archivedAt ? <Button variant="secondary" size="sm" onClick={onArchive} disabled={disabled}>Archive</Button> : null}
          </div>
          <div className="co-reports-mobile-closeout-facts">
            <span><em>Date</em><strong>{reportDraft.reportDate || report.reportDate}</strong></span>
            <span><em>Weather</em><strong>{reportDraft.weather || "Pending"}</strong></span>
            <span><em>Concrete</em><strong>{dailyReportConcreteSummary(reportDraft)}</strong></span>
            <span><em>Time</em><strong>{formatMinutes(report.timeSummary.totalMinutes)}</strong></span>
          </div>
          <DailyReportProofChecklist proofState={proofState} />
        </Card>

        {canEditFieldCloseout ? (
          <DailyReportMobileAccordionCard title="Edit closeout" summary={closeoutSummary}>
            <div className="co-reports-mobile-essentials-grid">
              <InputField label="Report date" type="date" value={reportDraft.reportDate} onChange={(event) => setReportDraft((current) => ({ ...current, reportDate: event.target.value }))} disabled={disabled} />
              <InputField label="Weather" value={reportDraft.weather} onChange={(event) => setReportDraft((current) => ({ ...current, weather: event.target.value }))} disabled={disabled} />
              <TextAreaField label="Work performed" value={reportDraft.workPerformed} onChange={(event) => setReportDraft((current) => ({ ...current, workPerformed: event.target.value }))} disabled={disabled} className="field-input min-h-20 resize-y" />
              <TextAreaField label="Crew summary" value={reportDraft.crewSummary} onChange={(event) => setReportDraft((current) => ({ ...current, crewSummary: event.target.value }))} disabled={disabled} className="field-input min-h-20 resize-y" />
            </div>
          </DailyReportMobileAccordionCard>
        ) : null}

        <details className="co-field-mobile-optional-details co-reports-mobile-optional-details co-reports-mobile-advanced-details">
          <summary>
            <span>
              <strong>More report fields</strong>
              <em>{reportDateSummary}</em>
            </span>
            <b aria-hidden="true" />
          </summary>
          <div className="co-field-mobile-optional-body">
            <TimestampMeta createdAt={report.createdAt} updatedAt={report.updatedAt} />
            {!canEditFieldCloseout ? (
              <DailyReportMobileFieldGroup title="Job / date" summary={reportDateSummary}>
                <InputField label="Report date" type="date" value={reportDraft.reportDate} onChange={(event) => setReportDraft((current) => ({ ...current, reportDate: event.target.value }))} disabled />
                <InputField label="Weather" value={reportDraft.weather} onChange={(event) => setReportDraft((current) => ({ ...current, weather: event.target.value }))} disabled />
              </DailyReportMobileFieldGroup>
            ) : null}
            {!canEditFieldCloseout ? (
              <DailyReportMobileFieldGroup title="Work performed" summary={reportDraft.workPerformed ? "Work notes added" : "No work notes"}>
                <TextAreaField label="Work performed" value={reportDraft.workPerformed} onChange={(event) => setReportDraft((current) => ({ ...current, workPerformed: event.target.value }))} disabled />
              </DailyReportMobileFieldGroup>
            ) : null}
            {!canEditFieldCloseout ? (
              <DailyReportMobileFieldGroup title="Crew / labor summary" summary={reportDraft.crewSummary ? "Crew summary added" : "No crew summary"}>
                <TextAreaField label="Crew summary" value={reportDraft.crewSummary} onChange={(event) => setReportDraft((current) => ({ ...current, crewSummary: event.target.value }))} disabled />
              </DailyReportMobileFieldGroup>
            ) : null}
            <DailyReportMobileFieldGroup title="Concrete / materials" summary={reportDraft.concretePoured ? `${reportDraft.yardsPoured || 0} yards poured` : "No concrete marked yet"}>
              <div className="grid gap-3">
                <label className="field-label">
                  <span>Concrete poured</span>
                  <input type="checkbox" checked={Boolean(reportDraft.concretePoured)} onChange={(event) => setReportDraft((current) => ({ ...current, concretePoured: event.target.checked, yardsPoured: event.target.checked ? current.yardsPoured : 0 }))} disabled={!canEdit || disabled} />
                </label>
                <InputField label="Yards poured" type="number" min="0" step="0.1" value={reportDraft.yardsPoured} onChange={(event) => setReportDraft((current) => ({ ...current, yardsPoured: Number(event.target.value) }))} disabled={!canEdit || disabled || !reportDraft.concretePoured} />
                <TextAreaField label="Material / concrete notes" value={reportDraft.materialNotes} onChange={(event) => setReportDraft((current) => ({ ...current, materialNotes: event.target.value }))} disabled={!canEdit || disabled} />
              </div>
            </DailyReportMobileFieldGroup>
            <DailyReportMobileFieldGroup title="Delays / safety / equipment" summary={[reportDraft.delays, reportDraft.safetyNotes, reportDraft.equipmentUsed].filter(Boolean).length ? "Notes added" : "Optional"}>
              <div className="grid gap-3">
                <TextAreaField label="Delays" value={reportDraft.delays} onChange={(event) => setReportDraft((current) => ({ ...current, delays: event.target.value }))} disabled={!canEdit || disabled} />
                <TextAreaField label="Safety notes" value={reportDraft.safetyNotes} onChange={(event) => setReportDraft((current) => ({ ...current, safetyNotes: event.target.value }))} disabled={!canEdit || disabled} />
                <TextAreaField label="Equipment used" value={reportDraft.equipmentUsed} onChange={(event) => setReportDraft((current) => ({ ...current, equipmentUsed: event.target.value }))} disabled={!canEdit || disabled} />
              </div>
            </DailyReportMobileFieldGroup>
            <DailyReportMobileFieldGroup title="Extra notes" summary={[reportDraft.visitorNotes, reportDraft.inspectionNotes, reportDraft.generalNotes].filter(Boolean).length ? "Notes added" : "Optional"}>
              <div className="grid gap-3">
                <TextAreaField label="Visitor notes" value={reportDraft.visitorNotes} onChange={(event) => setReportDraft((current) => ({ ...current, visitorNotes: event.target.value }))} disabled={!canEdit || disabled} />
                <TextAreaField label="Inspection notes" value={reportDraft.inspectionNotes} onChange={(event) => setReportDraft((current) => ({ ...current, inspectionNotes: event.target.value }))} disabled={!canEdit || disabled} />
                <TextAreaField label="General notes" value={reportDraft.generalNotes} onChange={(event) => setReportDraft((current) => ({ ...current, generalNotes: event.target.value }))} disabled={!canEdit || disabled} />
              </div>
            </DailyReportMobileFieldGroup>
            <DailyReportMobileFieldGroup title="Crew and time summary" summary={`${report.timeSummary.totalEntries} entries / ${formatMinutes(report.timeSummary.totalMinutes)} worked`}>
              <div className="grid gap-3">
                <div className="flex flex-wrap gap-2">
                  <Badge tone="slate">{report.timeSummary.totalEntries} time entries</Badge>
                  <Badge tone="slate">{formatMinutes(report.timeSummary.totalMinutes)} worked</Badge>
                  <Badge tone="slate">{formatMinutes(report.timeSummary.breakMinutes)} breaks</Badge>
                </div>
                {report.crewAssignments.length === 0 ? (
                  <StateCard title="No crew assigned yet" description="Assigned crew will appear here once scheduling adds them to the job." tone="slate" />
                ) : (
                  <div className="space-y-2">
                    {report.crewAssignments.map((assignment) => (
                      <div key={assignment.id || `${assignment.userId}-${assignment.roleOnJob}`} className="rounded-2xl border border-blue-100 bg-white p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-black text-slate-950">{assignment.userName}</p>
                          <Badge tone="slate">{assignment.roleOnJob}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </DailyReportMobileFieldGroup>
          </div>
        </details>
      </div>

      <Card className="hidden p-5 md:block">
        <div className="mb-3 grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
          <div className="min-w-0">
            <h2 className="break-words text-base font-black text-slate-950">{jobTitle(report.job)}</h2>
            <p className="mt-1 break-words text-sm leading-5 text-slate-500">{`${report.reportDate} - ${report.createdByName}`}</p>
          </div>
          <div className="min-w-0 max-w-full">
            <div className="flex min-w-0 flex-wrap gap-2 xl:justify-end">
              <DailyReportStatusBadge status={report.status} />
              {canView ? <Button variant="secondary" size="sm" onClick={onPrintReport} disabled={disabled || typeof onPrintReport !== "function"}>Print Daily Report</Button> : null}
              {canReview && ["submitted", "reopened"].includes(report.status) ? <Button variant="secondary" size="sm" onClick={onReview} disabled={disabled}>Review</Button> : null}
              {canReview && ["submitted", "reviewed"].includes(report.status) ? <Button variant="secondary" size="sm" onClick={onReopen} disabled={disabled}>Reopen</Button> : null}
              {canArchive && !report.archivedAt ? <Button variant="secondary" size="sm" onClick={onArchive} disabled={disabled}>Archive</Button> : null}
              {canEdit && ["draft", "reopened"].includes(report.status) ? <Button size="sm" onClick={onSave} disabled={disabled}>Save report</Button> : null}
              {canEdit && ["draft", "reopened"].includes(report.status) ? <Button variant="secondary" size="sm" onClick={onSubmit} disabled={disabled}>Submit</Button> : null}
            </div>
          </div>
        </div>
        <DailyReportProofChecklist proofState={proofState} />
        <div className="grid gap-3">
          <TimestampMeta createdAt={report.createdAt} updatedAt={report.updatedAt} />
          <div className="grid gap-3 md:grid-cols-2">
            <InputField label="Report date" type="date" value={reportDraft.reportDate} onChange={(event) => setReportDraft((current) => ({ ...current, reportDate: event.target.value }))} disabled={!canEdit || disabled} />
            <InputField label="Weather" value={reportDraft.weather} onChange={(event) => setReportDraft((current) => ({ ...current, weather: event.target.value }))} disabled={!canEdit || disabled} />
          </div>
          <TextAreaField label="Crew summary" value={reportDraft.crewSummary} onChange={(event) => setReportDraft((current) => ({ ...current, crewSummary: event.target.value }))} disabled={!canEdit || disabled} />
          <TextAreaField label="Work performed" value={reportDraft.workPerformed} onChange={(event) => setReportDraft((current) => ({ ...current, workPerformed: event.target.value }))} disabled={!canEdit || disabled} />
          <div className="grid gap-3 md:grid-cols-2">
            <TextAreaField label="Delays" value={reportDraft.delays} onChange={(event) => setReportDraft((current) => ({ ...current, delays: event.target.value }))} disabled={!canEdit || disabled} />
            <TextAreaField label="Safety notes" value={reportDraft.safetyNotes} onChange={(event) => setReportDraft((current) => ({ ...current, safetyNotes: event.target.value }))} disabled={!canEdit || disabled} />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <TextAreaField label="Equipment used" value={reportDraft.equipmentUsed} onChange={(event) => setReportDraft((current) => ({ ...current, equipmentUsed: event.target.value }))} disabled={!canEdit || disabled} />
            <TextAreaField label="Material / concrete notes" value={reportDraft.materialNotes} onChange={(event) => setReportDraft((current) => ({ ...current, materialNotes: event.target.value }))} disabled={!canEdit || disabled} />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="field-label">
              <span>Concrete poured</span>
              <input type="checkbox" checked={Boolean(reportDraft.concretePoured)} onChange={(event) => setReportDraft((current) => ({ ...current, concretePoured: event.target.checked, yardsPoured: event.target.checked ? current.yardsPoured : 0 }))} disabled={!canEdit || disabled} />
            </label>
            <InputField label="Yards poured" type="number" min="0" step="0.1" value={reportDraft.yardsPoured} onChange={(event) => setReportDraft((current) => ({ ...current, yardsPoured: Number(event.target.value) }))} disabled={!canEdit || disabled || !reportDraft.concretePoured} />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <TextAreaField label="Visitor notes" value={reportDraft.visitorNotes} onChange={(event) => setReportDraft((current) => ({ ...current, visitorNotes: event.target.value }))} disabled={!canEdit || disabled} />
            <TextAreaField label="Inspection notes" value={reportDraft.inspectionNotes} onChange={(event) => setReportDraft((current) => ({ ...current, inspectionNotes: event.target.value }))} disabled={!canEdit || disabled} />
          </div>
          <TextAreaField label="General notes" value={reportDraft.generalNotes} onChange={(event) => setReportDraft((current) => ({ ...current, generalNotes: event.target.value }))} disabled={!canEdit || disabled} />
        </div>
      </Card>

      <Card className="hidden p-5 md:block">
        <SectionHeader title="Crew and time summary" description="Field-safe assignment and hours snapshot for this report date." />
        <div className="grid gap-3">
          <div className="flex flex-wrap gap-2">
            <Badge tone="slate">{report.timeSummary.totalEntries} time entries</Badge>
            <Badge tone="slate">{formatMinutes(report.timeSummary.totalMinutes)} worked</Badge>
            <Badge tone="slate">{formatMinutes(report.timeSummary.breakMinutes)} breaks</Badge>
          </div>
          {report.crewAssignments.length === 0 ? (
            <StateCard title="No crew assigned yet" description="Assigned crew will appear here once scheduling adds them to the job." tone="slate" />
          ) : (
            <div className="space-y-2">
              {report.crewAssignments.map((assignment) => (
                <div key={assignment.id || `${assignment.userId}-${assignment.roleOnJob}`} className="rounded-2xl border border-blue-100 bg-white p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-black text-slate-950">{assignment.userName}</p>
                    <Badge tone="slate">{assignment.roleOnJob}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function ReportsCommandRailPolished({
  report,
  proofState,
  canView,
  canCreate,
  canEdit,
  canReview,
  canArchive,
  disabled,
  notFound,
  onPrintReport,
  onSubmit,
  onReview,
  onReopen,
  onArchive,
  onOpenTool,
}) {
  if (!canView) {
    return (
      <div className="co-reports-right-rail space-y-4">
        <Card className="co-reports-rail-card p-4">
          <SectionHeader title="Reports unavailable" description="This role cannot access daily reports." />
          <StateCard title="Access blocked" description="Daily reports stay limited to approved field and office roles." tone="slate" />
        </Card>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="co-reports-right-rail space-y-4">
        <Card className="co-reports-rail-card p-4">
          <SectionHeader title="Report not found" description="This route is outside the current visible report scope." />
          <StateCard title="Unavailable report" description="The report may be archived, removed, or hidden by role scope." tone="red" />
        </Card>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="co-reports-right-rail space-y-4">
        <Card className="co-reports-rail-card p-4">
          <SectionHeader title="Report Console" description="Select a daily report or start a new draft." />
          <div className="co-reports-empty-rail">
            <span><Icon name="document" /></span>
            <strong>No report selected</strong>
            <p>Choose a row to review job context, crew/time, concrete notes, and review actions here.</p>
          </div>
          {canCreate ? <Button type="button" className="mt-3 w-full" onClick={() => onOpenTool("create")}>Start Report</Button> : null}
        </Card>
      </div>
    );
  }

  return (
    <div className="co-reports-right-rail space-y-4">
      <Card className="co-reports-rail-card p-4">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Selected report summary</p>
            <h3 className="mt-2 break-words text-xl font-black leading-tight text-slate-950">{jobTitle(report.job)}</h3>
            <p className="mt-1 break-words text-xs font-black text-slate-500">{report.reportDate} / {report.createdByName}</p>
          </div>
          <DailyReportStatusBadge status={report.status} />
        </div>

        <div className="co-reports-selected-metrics">
          <div>
            <span>Time</span>
            <strong>{formatMinutes(report.timeSummary?.totalMinutes || 0)}</strong>
          </div>
          <div>
            <span>Crew</span>
            <strong>{report.crewAssignments?.length || 0} assigned</strong>
          </div>
          <div>
            <span>Concrete</span>
            <strong>{dailyReportConcreteSummary(report)}</strong>
          </div>
          <div>
            <span>Weather</span>
            <strong>{report.weather || "Not set"}</strong>
          </div>
          <div>
            <span>Photos</span>
            <strong>{proofState ? proofState.photoCount : 0} linked</strong>
          </div>
          <div>
            <span>Tickets</span>
            <strong>{proofState ? proofState.ticketCount : 0} linked</strong>
          </div>
        </div>

        <div className="co-reports-note-panel">
          <span>Field notes</span>
          <p>{dailyReportPrimaryNote(report)}</p>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button type="button" size="sm" onClick={() => onOpenTool("details")}>Edit / View</Button>
          <Button type="button" size="sm" variant="secondary" onClick={onPrintReport} disabled={disabled || typeof onPrintReport !== "function"}>Print</Button>
          {canEdit && ["draft", "reopened"].includes(report.status) ? <Button type="button" size="sm" variant="secondary" onClick={onSubmit} disabled={disabled}>Submit</Button> : null}
          {canReview && ["submitted", "reopened"].includes(report.status) ? <Button type="button" size="sm" variant="secondary" onClick={onReview} disabled={disabled}>Review</Button> : null}
          {canReview && ["submitted", "reviewed"].includes(report.status) ? <Button type="button" size="sm" variant="secondary" onClick={onReopen} disabled={disabled}>Reopen</Button> : null}
          {canArchive && !report.archivedAt ? <Button type="button" size="sm" variant="secondary" onClick={onArchive} disabled={disabled}>Archive</Button> : null}
        </div>
      </Card>

      <Card className="co-reports-rail-card p-4">
        <SectionHeader title="Readiness" description="Daily report review should explain the field day quickly." />
        <DailyReportProofChecklist proofState={proofState} />
      </Card>
    </div>
  );
}

export function ReportsPagePolished({
  user,
  permissions,
  reports = [],
  jobs = [],
  users = [],
  uploads = [],
  deliveryTickets = [],
  prePourChecklists = [],
  postPourChecklists = [],
  toolChecklists = [],
  safetyIncidents = [],
  setActive,
  filter,
  setFilter,
  search,
  setSearch,
  jobFilter,
  setJobFilter,
  creatorFilter,
  setCreatorFilter,
  dateFilter,
  setDateFilter,
  selectedReportId,
  onSelectReport,
  selectedReport,
  reportDraft,
  setReportDraft,
  createDraft,
  setCreateDraft,
  onCreateReport,
  onSaveReport,
  onSubmitReport,
  onReviewReport,
  onReopenReport,
  onArchiveReport,
  onPrintDailyReport,
  onOpenSupport,
  busy,
  reportRouteRequested,
  assistantReportReviewSeed = null,
  onAssistantReportReviewSeedHandled = () => {},
}) {
  const canView = permissions.reports.canView;
  const canCreate = permissions.reports.canCreate;
  const isFieldReportWorkspace = canCreate && !permissions.reports.canManageAll;
  const canViewAdvancedReporting = Boolean(permissions.reports.canManageAll && permissions.reports.canViewAdvanced);
  const [showReportTools, setShowReportTools] = useState(false);
  const [activeReportTool, setActiveReportTool] = useState("create");
  const [visibleReportCap, setVisibleReportCap] = useState(8);
  const [reportShellSelectionId, setReportShellSelectionId] = useState("");
  const [reportShellMode, setReportShellMode] = useState("detail");
  const reportToolsRef = useRef(null);
  const listState = useMemo(() => deriveDailyReportListState(reports), [reports]);
  const visibleRows = useMemo(() => filterDailyReports(reports, {
    status: filter,
    query: search,
    jobId: jobFilter,
    createdBy: creatorFilter,
    date: dateFilter,
  }), [creatorFilter, dateFilter, filter, jobFilter, reports, search]);
  const notFound = Boolean(reportRouteRequested) && !selectedReport;
  const canEdit = Boolean(selectedReport) && ((permissions.reports.canManageAll && !selectedReport.archivedAt) || (user?.role === "Foreman" && ["draft", "reopened"].includes(selectedReport.status)));
  const canReviewActions = permissions.reports.canReview;
  const submittedCount = visibleRows.filter(dailyReportNeedsReview).length;
  const reviewedCount = visibleRows.filter((report) => report.status === "reviewed").length;
  const needsActionCount = visibleRows.filter(dailyReportNeedsAction).length;
  const concreteCount = visibleRows.filter((report) => report.concretePoured).length;
  const missingBasicsCount = visibleRows.filter((report) => !report.workPerformed || !report.crewSummary || !report.weather).length;
  const operatingDate = dateFilter !== "All dates" ? dateFilter : todayDateInputValue();
  const liveReportJobs = useMemo(() => normalizeObjectArray(jobs).filter(dailyReportIsLiveJob), [jobs]);
  const reportsForOperatingDate = useMemo(() => reports.filter((report) => dailyReportDateKey(report.reportDate || report.createdAt) === operatingDate && !report.archivedAt), [operatingDate, reports]);
  const reportedJobIdsForOperatingDate = useMemo(() => new Set(reportsForOperatingDate.map((report) => report.jobId || report.job?.id).filter(Boolean)), [reportsForOperatingDate]);
  const missingReportJobs = useMemo(() => liveReportJobs.filter((job) => !reportedJobIdsForOperatingDate.has(job.id)), [liveReportJobs, reportedJobIdsForOperatingDate]);
  const proofSource = useMemo(() => ({
    uploads,
    deliveryTickets,
    prePourChecklists,
    postPourChecklists,
    toolChecklists,
    safetyIncidents,
  }), [deliveryTickets, postPourChecklists, prePourChecklists, safetyIncidents, toolChecklists, uploads]);
  const proofStateByReportId = useMemo(() => {
    const nextMap = new Map();
    reports.forEach((report) => {
      nextMap.set(report.id, deriveDailyReportProofState({ report, ...proofSource }));
    });
    return nextMap;
  }, [proofSource, reports]);
  const proofGapReports = visibleRows.filter((report) => (proofStateByReportId.get(report.id)?.gapCount || 0) > 0);
  const advancedReportSummary = useMemo(() => deriveAdvancedReportSummary(visibleRows, {
    proofStateByReportId,
  }), [proofStateByReportId, visibleRows]);
  const selectedReportProofState = selectedReport ? proofStateByReportId.get(selectedReport.id) : null;
  const canOpenReportSupport = Boolean(canView && permissions?.support?.canView && typeof onOpenSupport === "function");
  const fieldFocusJob = liveReportJobs[0] || normalizeObjectArray(jobs).find((job) => !job.archivedAt) || null;
  const fieldFocusReport = (
    (fieldFocusJob && reportsForOperatingDate.find((report) => (report.jobId || report.job?.id) === fieldFocusJob.id))
    || visibleRows.find(dailyReportNeedsAction)
    || selectedReport
    || visibleRows[0]
    || null
  );
  const fieldFocusProof = fieldFocusReport
    ? proofStateByReportId.get(fieldFocusReport.id)
    : deriveDailyReportProofState({ job: fieldFocusJob, operatingDate, ...proofSource });
  const reportKpis = [
    { label: "Reports", value: visibleRows.length, helper: "Matching current filters", icon: "document", tone: "orange", actionLabel: "View reports", onAction: () => setFilter("All") },
    { label: "Submitted", value: submittedCount, helper: "Waiting office review", icon: "clipboard", tone: submittedCount ? "orange" : "slate", actionLabel: "Review queue", onAction: () => setFilter("Submitted") },
    { label: "Reviewed", value: reviewedCount, helper: "Closed for field review", icon: "check", tone: "green", actionLabel: "View reviewed", onAction: () => setFilter("Reviewed") },
    { label: "Needs Action", value: needsActionCount, helper: "Drafts or reopened reports", icon: "alert", tone: needsActionCount ? "amber" : "slate", actionLabel: "Open drafts", onAction: () => setFilter("Draft") },
    { label: "Concrete", value: concreteCount, helper: "Reports with pour detail", icon: "hardhat", tone: concreteCount ? "orange" : "slate" },
  ];
  const reportToolTabs = [
    { id: "create", label: "Start Report", count: canCreate ? 1 : 0 },
    { id: "details", label: "Edit / Review", count: selectedReport ? 1 : 0 },
  ];

  function openPriorityReport(matchReport, fallbackFilter = "All") {
    const targetReport = visibleRows.find(matchReport) || reports.find(matchReport);
    if (targetReport?.id) {
      onSelectReport(targetReport.id);
    }
    setFilter(fallbackFilter === "Draft" && targetReport?.status === "reopened" ? "Reopened" : fallbackFilter);
    openReportTool("details");
  }

  function openReportTool(toolId = "details") {
    setActiveReportTool(toolId);
    setShowReportTools(true);
    window.setTimeout(() => reportToolsRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" }), 0);
  }

  function selectReportTool(toolId = "details") {
    setActiveReportTool(toolId);
    window.setTimeout(() => reportToolsRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" }), 0);
  }

  function startReportForJob(job = null) {
    if (!canCreate) return;
    setCreateDraft((current) => ({
      ...current,
      jobId: job?.id || current.jobId || "",
      reportDate: operatingDate || current.reportDate || todayDateInputValue(),
    }));
    openReportTool("create");
  }

  function openReportRecord(report) {
    if (report?.id) {
      onSelectReport(report.id);
    }
    openReportTool("details");
  }

  useEffect(() => {
    const seed = assistantReportReviewSeed;
    if (!seed?.nonce || !canReviewActions) return;

    const liveReports = normalizeObjectArray(reports).filter((report) => !report.archivedAt);
    const targetReportId = seed.reportId && liveReports.some((report) => report?.id === seed.reportId)
      ? seed.reportId
      : liveReports.find(dailyReportNeedsReview)?.id || liveReports[0]?.id || "";
    setFilter(targetReportId && liveReports.find((report) => report.id === targetReportId)?.status === "submitted" ? "Submitted" : "All");
    setJobFilter("All jobs");
    setCreatorFilter("All creators");
    setDateFilter("All dates");
    setSearch("");
    if (targetReportId) onSelectReport(targetReportId);
    openReportTool("details");
    onAssistantReportReviewSeedHandled(seed.nonce);
  }, [assistantReportReviewSeed?.nonce, canReviewActions, reports]);

  function openAdvancedReportItem(item) {
    if (item?.filter) {
      setFilter(item.filter);
    }
    const targetReport = reports.find((report) => report.id === item?.id) || visibleRows.find((report) => report.id === item?.id);
    if (targetReport?.id) {
      onSelectReport(targetReport.id);
    }
    openReportTool("details");
  }

  function openReportModule(moduleId) {
    if (typeof setActive === "function") {
      setActive(moduleId);
    }
  }

  function requestDailyReportsSupportReview() {
    if (!canOpenReportSupport) return;
    onOpenSupport(buildDailyReportsSupportContext({
      user,
      permissions,
      visibleRows,
      selectedReport,
      filters: {
        status: filter,
        query: search,
        jobId: jobFilter,
        createdBy: creatorFilter,
        date: dateFilter,
      },
      proofStateByReportId,
    }));
  }

  const reviewPriorityCard = {
    label: "Review submitted",
    value: submittedCount,
    helper: submittedCount ? "Submitted reports waiting for office review." : "No submitted reports waiting right now.",
    icon: "clipboard",
    tone: submittedCount ? "amber" : "green",
    actionLabel: submittedCount ? "Open review" : "View reviewed",
    onAction: () => openPriorityReport(dailyReportNeedsReview, submittedCount ? "Submitted" : "Reviewed"),
  };
  const draftsPriorityCard = {
    label: "Finish field drafts",
    value: needsActionCount,
    helper: needsActionCount ? "Draft or reopened reports need field completion." : "No draft or reopened reports in this view.",
    icon: "document",
    tone: needsActionCount ? "orange" : "slate",
    actionLabel: needsActionCount ? "Open draft" : "All clear",
    onAction: () => openPriorityReport(dailyReportNeedsAction, "Draft"),
  };
  const basicsPriorityCard = {
    label: "Complete basics",
    value: missingBasicsCount,
    helper: "Checks work performed, crew summary, and weather fields.",
    icon: "alert",
    tone: missingBasicsCount ? "amber" : "green",
    actionLabel: missingBasicsCount ? "Find gaps" : "Ready",
    onAction: () => openPriorityReport((report) => !report.workPerformed || !report.crewSummary || !report.weather, "All"),
  };
  const startPriorityCard = {
    label: isFieldReportWorkspace ? "Start field report" : "Start today's report",
    value: canCreate ? 1 : 0,
    helper: canCreate ? "Open the real daily report form for a visible job." : "Creation is not enabled for this role.",
    icon: "plus",
    tone: canCreate ? "orange" : "slate",
    actionLabel: canCreate ? "Start report" : "Read only",
    onAction: () => (canCreate ? openReportTool("create") : openReportTool("details")),
  };
  const reportPriorityCards = isFieldReportWorkspace
    ? [startPriorityCard, draftsPriorityCard, basicsPriorityCard, reviewPriorityCard]
    : visibleRows.length === 0 && canCreate
    ? [startPriorityCard, reviewPriorityCard, draftsPriorityCard, basicsPriorityCard]
    : [reviewPriorityCard, draftsPriorityCard, basicsPriorityCard, startPriorityCard];
  const mobileFocusCards = isFieldReportWorkspace
    ? [draftsPriorityCard, basicsPriorityCard, reviewPriorityCard]
    : [reviewPriorityCard, draftsPriorityCard, basicsPriorityCard];
  const canUseReportsCommandShell = Boolean(canView && permissions.reports.canManageAll && !isFieldReportWorkspace);
  const fieldTabletReportRows = [
    ...missingReportJobs.slice(0, 2).map((job) => ({
      id: `missing-${job.id}`,
      kind: "missing",
      job,
      title: jobTitle(job),
      meta: jobScheduleLabel(job),
      statusLabel: "Not started",
      tone: "amber",
    })),
    ...visibleRows.slice(0, 5).map((report) => {
      const proofState = proofStateByReportId.get(report.id);
      return {
        id: report.id,
        kind: "report",
        report,
        title: jobTitle(report.job),
        meta: `${report.reportDate || "Date pending"} / ${report.createdByName || "Field crew"}`,
        statusLabel: reportStatusLabel(report.status),
        tone: (proofState?.gapCount || 0) ? "amber" : dailyReportNeedsAction(report) ? "orange" : "green",
      };
    }),
  ].slice(0, 5);
  const selectedFieldTabletReport = selectedReport || fieldFocusReport || visibleRows[0] || null;
  const selectedFieldTabletProof = selectedFieldTabletReport
    ? proofStateByReportId.get(selectedFieldTabletReport.id)
    : fieldFocusProof;
  const fieldTabletReportKpis = [
    { label: "Missing Today", value: missingReportJobs.length, helper: operatingDate, tone: missingReportJobs.length ? "amber" : "green" },
    { label: "Drafts Open", value: needsActionCount, helper: "Draft or reopened", tone: needsActionCount ? "orange" : "green" },
    { label: "Submitted", value: submittedCount, helper: "Waiting review", tone: submittedCount ? "orange" : "slate" },
    { label: "Proof Gaps", value: proofGapReports.length, helper: "Photos, tickets, checklists", tone: proofGapReports.length ? "amber" : "green" },
  ];
  const reportShellKpis = [
    {
      label: "Missing Today",
      value: missingReportJobs.length,
      helper: `${operatingDate} job reports not started`,
      icon: "alert",
      tone: missingReportJobs.length ? "amber" : "green",
      onClick: () => {
        setDateFilter(operatingDate);
        setFilter("All");
      },
    },
    {
      label: "Drafts Open",
      value: needsActionCount,
      helper: "Draft or reopened reports",
      icon: "document",
      tone: needsActionCount ? "orange" : "green",
      onClick: () => setFilter("Draft"),
    },
    {
      label: "Needs Review",
      value: submittedCount,
      helper: "Submitted for office closeout",
      icon: "clipboard",
      tone: submittedCount ? "orange" : "green",
      onClick: () => setFilter("Submitted"),
    },
    {
      label: "Proof Gaps",
      value: proofGapReports.length,
      helper: "Notes, photos, tickets, or checklists",
      icon: "upload",
      tone: proofGapReports.length ? "amber" : "green",
      onClick: () => {
        const targetReport = proofGapReports[0];
        if (targetReport?.id) {
          onSelectReport(targetReport.id);
          setReportShellSelectionId(`proof-${targetReport.id}`);
          setReportShellMode("detail");
        }
      },
    },
  ];
  const reportShellQueue = useMemo(() => {
    const items = [];
    const seenReportIds = new Set();

    missingReportJobs.forEach((job, index) => {
      items.push({
        id: `missing-${job.id}`,
        kind: "missing",
        job,
        priority: 10 + index,
        eyebrow: "Missing report",
        title: jobTitle(job),
        meta: [job.customer, jobScheduleLabel(job)].filter(Boolean).join(" / ") || operatingDate,
        statusLabel: "Not started",
        tone: "amber",
        actionLabel: canCreate ? "Start report" : "View job",
        badges: [
          { label: "Today", tone: "amber" },
          { label: "Blocks proof", tone: "orange" },
        ],
      });
    });

    function addReportItem(report, kind, priority) {
      if (!report?.id || seenReportIds.has(report.id)) return;
      seenReportIds.add(report.id);
      const proofState = proofStateByReportId.get(report.id);
      const isProofGap = kind === "proof";
      const isDraft = kind === "draft";
      items.push({
        id: `${kind}-${report.id}`,
        kind,
        report,
        reportId: report.id,
        priority,
        eyebrow: isProofGap ? "Proof gap" : isDraft ? "Draft open" : "Needs review",
        title: jobTitle(report.job),
        meta: `${report.reportDate || "Date pending"} / ${report.createdByName || "Field crew"}`,
        statusLabel: reportStatusLabel(report.status),
        tone: isProofGap ? "amber" : isDraft ? "orange" : "orange",
        actionLabel: "Open report",
        badges: [
          { label: dailyReportProofSummary(proofState), tone: (proofState?.gapCount || 0) ? "amber" : "green" },
          { label: dailyReportConcreteSummary(report), tone: report.concretePoured ? "orange" : "slate" },
          { label: reportStatusLabel(report.status), tone: "slate" },
        ],
      });
    }

    visibleRows.filter(dailyReportNeedsReview).forEach((report, index) => addReportItem(report, "review", 30 + index));
    proofGapReports.forEach((report, index) => addReportItem(report, "proof", 50 + index));
    visibleRows.filter(dailyReportNeedsAction).forEach((report, index) => addReportItem(report, "draft", 70 + index));

    return items.sort((left, right) => left.priority - right.priority).slice(0, 7);
  }, [canCreate, missingReportJobs, operatingDate, proofGapReports, proofStateByReportId, visibleRows]);
  const createReportShellItem = {
    id: "create-report",
    kind: "create",
    title: "Start daily report",
    meta: operatingDate,
    statusLabel: "New",
    tone: "orange",
  };
  const reportShellFallbackItem = reportShellQueue.find((item) => item.reportId && item.reportId === selectedReport?.id) || reportShellQueue[0] || null;
  const selectedReportShellItem = reportShellMode === "create" && reportShellSelectionId === createReportShellItem.id
    ? createReportShellItem
    : reportShellQueue.find((item) => item.id === reportShellSelectionId) || reportShellFallbackItem;
  const reportShellSelectedId = selectedReportShellItem?.id || "";
  const reportShellAssistantDescription = proofGapReports.length
    ? `${proofGapReports.length} proof gap${proofGapReports.length === 1 ? "" : "s"} need office review before closeout.`
    : submittedCount
      ? `${submittedCount} submitted report${submittedCount === 1 ? "" : "s"} waiting on signoff.`
      : missingReportJobs.length
        ? `${missingReportJobs.length} job${missingReportJobs.length === 1 ? "" : "s"} still need today's report.`
        : "Daily report closeout is clear for the current view.";

  useEffect(() => {
    if (!canUseReportsCommandShell) return;
    const fallbackId = reportShellFallbackItem?.id || "";
    if (!reportShellSelectionId && fallbackId) {
      setReportShellSelectionId(fallbackId);
      setReportShellMode("detail");
      return;
    }
    if (reportShellSelectionId && reportShellMode !== "create" && !reportShellQueue.some((item) => item.id === reportShellSelectionId)) {
      setReportShellSelectionId(fallbackId);
    }
  }, [canUseReportsCommandShell, reportShellFallbackItem?.id, reportShellMode, reportShellQueue, reportShellSelectionId]);

  function selectReportShellItem(item) {
    if (!item) return;
    setReportShellSelectionId(item.id);
    if (item.kind === "missing") {
      setReportShellMode("create");
      setCreateDraft((current) => ({
        ...current,
        jobId: item.job?.id || current.jobId || "",
        reportDate: operatingDate || current.reportDate || todayDateInputValue(),
      }));
      return;
    }
    setReportShellMode(item.kind === "create" ? "create" : "detail");
    if (item.report?.id) {
      onSelectReport(item.report.id);
    }
  }

  function startReportInShell(job = null) {
    if (!canCreate) return;
    const targetJob = job || missingReportJobs[0] || liveReportJobs[0] || null;
    setCreateDraft((current) => ({
      ...current,
      jobId: targetJob?.id || current.jobId || "",
      reportDate: operatingDate || current.reportDate || todayDateInputValue(),
    }));
    const matchingMissingItem = targetJob ? reportShellQueue.find((item) => item.kind === "missing" && item.job?.id === targetJob.id) : null;
    setReportShellSelectionId(matchingMissingItem?.id || createReportShellItem.id);
    setReportShellMode("create");
  }

  function openFirstReportShellItem(matchReport, nextFilter = "All") {
    const targetReport = visibleRows.find(matchReport) || reports.find(matchReport);
    setFilter(nextFilter);
    if (!targetReport?.id) return;
    onSelectReport(targetReport.id);
    const matchingItem = reportShellQueue.find((item) => item.reportId === targetReport.id);
    setReportShellSelectionId(matchingItem?.id || `review-${targetReport.id}`);
    setReportShellMode("detail");
  }

  function renderReportShellDetail(item) {
    const isCreateMode = item?.kind === "create" || item?.kind === "missing" || reportShellMode === "create";
    if (isCreateMode) {
      return (
        <div className="co-reports-shell-detail-scroll">
          <DailyReportCreateCard draft={createDraft} setDraft={setCreateDraft} onCreate={onCreateReport} disabled={busy} canCreate={canCreate} jobs={jobs.filter((job) => !job.archivedAt)} />
        </div>
      );
    }

    const detailReport = item?.report?.id === selectedReport?.id ? selectedReport : (item?.report || selectedReport);
    const detailProofState = detailReport ? proofStateByReportId.get(detailReport.id) : selectedReportProofState;
    const canEditDetailReport = Boolean(detailReport) && ((permissions.reports.canManageAll && !detailReport.archivedAt) || (user?.role === "Foreman" && ["draft", "reopened"].includes(detailReport.status)));

    return (
      <div className="co-reports-shell-detail-scroll">
        <DailyReportDetailPanel
          report={detailReport}
          proofState={detailProofState}
          reportDraft={reportDraft}
          setReportDraft={setReportDraft}
          onSave={onSaveReport}
          onSubmit={onSubmitReport}
          onReview={onReviewReport}
          onReopen={onReopenReport}
          onArchive={onArchiveReport}
          canView={canView}
          canEdit={canEditDetailReport}
          canReview={canReviewActions}
          canArchive={permissions.reports.canManageAll}
          disabled={busy}
          notFound={notFound}
          onPrintReport={detailReport ? () => onPrintDailyReport?.(detailReport) : undefined}
        />
      </div>
    );
  }

  if (canUseReportsCommandShell) {
    return (
      <div className="co-office-page co-reports-page co-reports-shell-page">
        <ApexOfficeCommandShell
          eyebrow="Field Ops"
          title="Daily Reports"
          description="Closeout command for missing reports, open drafts, office review, and proof gaps."
          kpis={reportShellKpis}
          queue={{
            title: "Report closeout queue",
            description: `${reportShellQueue.length} priority item${reportShellQueue.length === 1 ? "" : "s"} shown from the current report view.`,
            items: reportShellQueue,
            selectedId: reportShellSelectedId,
            onSelect: selectReportShellItem,
            emptyState: <StateCard title="Report queue clear" description="Missing reports, submitted reviews, drafts, and proof gaps appear here when they need action." tone="green" />,
          }}
          detail={{
            title: selectedReportShellItem?.kind === "create" || selectedReportShellItem?.kind === "missing" ? "Start report" : "Selected report",
            item: selectedReportShellItem,
            render: renderReportShellDetail,
            emptyState: <StateCard title="No report selected" description="Select a report queue item or start a new daily report." tone="slate" />,
          }}
          assistant={{
            title: "Report Closeout",
            description: reportShellAssistantDescription,
            priorities: [
              { label: "Missing", value: missingReportJobs.length, tone: missingReportJobs.length ? "amber" : "green" },
              { label: "Drafts", value: needsActionCount, tone: needsActionCount ? "orange" : "green" },
              { label: "Review", value: submittedCount, tone: submittedCount ? "orange" : "green" },
              { label: "Proof gaps", value: proofGapReports.length, tone: proofGapReports.length ? "amber" : "green" },
            ],
            actions: [
              canCreate ? { label: "Start report", icon: "plus", onClick: () => startReportInShell() } : null,
              { label: canReviewActions ? "Review submitted" : "View submitted", icon: "check", onClick: () => openFirstReportShellItem(dailyReportNeedsReview, "Submitted") },
              { label: "Open uploads", icon: "upload", onClick: () => openReportModule("uploads"), disabled: !permissions?.uploads?.canView },
            ].filter(Boolean),
            guardrails: [
              "Manual report review only",
              "No automatic external sends",
              "Role and company scope unchanged",
            ],
          }}
          quickActions={[
            canCreate ? { id: "start-report", label: "Start Report", icon: "plus", onClick: () => startReportInShell() } : null,
            { id: "review-queue", label: "Review Queue", icon: "check", onClick: () => openFirstReportShellItem(dailyReportNeedsReview, "Submitted") },
            { id: "proof-gaps", label: "Proof Gaps", icon: "upload", onClick: () => openFirstReportShellItem((report) => (proofStateByReportId.get(report.id)?.gapCount || 0) > 0, "All") },
          ].filter(Boolean)}
          className="co-reports-command-shell"
        />
      </div>
    );
  }

  return (
    <div className="co-office-page co-reports-page" data-field-workspace={isFieldReportWorkspace ? "true" : undefined}>
      <PageHeader
        eyebrow={permissions.reports.canManageAll ? "Field Ops" : "Field Workspace"}
        title="Daily Reports"
        description={isFieldReportWorkspace ? "Start today's report, finish field drafts, and keep job progress easy for the office to review." : "Capture field progress, crew notes, weather, concrete activity, and review status from one daily report board."}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => openReportTool("details")}>{canView ? visibleRows.length : 0} visible reports</Button>
            {canOpenReportSupport ? (
              <Button type="button" size="sm" variant="secondary" onClick={requestDailyReportsSupportReview}>
                <Icon name="help" />Report Support
              </Button>
            ) : null}
            {canCreate ? <Button type="button" onClick={() => openReportTool("create")}>Start Report</Button> : null}
          </div>
        }
      />

      {isFieldReportWorkspace ? (
        <section className="co-field-tablet-command co-reports-tablet-command mx-auto w-full max-w-[1520px] min-w-0 px-4 pb-4 sm:px-5" aria-label="Tablet daily reports command">
          <div className="co-field-tablet-shell">
            <div className="co-field-tablet-head">
              <div className="min-w-0">
                <p>Tablet reports</p>
                <h2>Daily Reports</h2>
                <span>Start today's report, finish field drafts, and keep proof gaps visible without a drawer.</span>
              </div>
              <Badge tone={canCreate ? "orange" : "slate"}>{canCreate ? "Report ready" : "Read-only"}</Badge>
            </div>

            <div className="co-field-tablet-kpis" aria-label="Daily report status">
              {fieldTabletReportKpis.map((item) => (
                <div key={item.label} className="co-field-tablet-kpi" data-tone={item.tone}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  <em>{item.helper}</em>
                </div>
              ))}
            </div>

            <div className="co-field-tablet-grid">
              <section className="co-field-tablet-actions" aria-label="Start daily report">
                <div className="co-field-tablet-section-head">
                  <div>
                    <strong>Start report</strong>
                    <span>{fieldFocusJob ? jobTitle(fieldFocusJob) : "Visible field job"}</span>
                  </div>
                  <Badge tone="slate">{operatingDate}</Badge>
                </div>
                <div className="co-field-tablet-scroll">
                  <DailyReportCreateCard draft={createDraft} setDraft={setCreateDraft} onCreate={onCreateReport} disabled={busy} canCreate={canCreate} jobs={jobs.filter((job) => !job.archivedAt)} />
                </div>
              </section>

              <section className="co-field-tablet-queue" aria-label="Daily report queue">
                <div className="co-field-tablet-section-head">
                  <div>
                    <strong>Report queue</strong>
                    <span>{fieldTabletReportRows.length} priority item{fieldTabletReportRows.length === 1 ? "" : "s"}</span>
                  </div>
                  <Badge tone={needsActionCount || missingReportJobs.length ? "amber" : "green"}>{needsActionCount + missingReportJobs.length} open</Badge>
                </div>
                <div className="co-field-tablet-list">
                  {fieldTabletReportRows.length === 0 ? (
                    <StateCard title="No report actions" description="Visible reports, missing jobs, and proof gaps appear here when they need field attention." tone="green" />
                  ) : fieldTabletReportRows.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`co-field-tablet-row co-focus-ring ${selectedFieldTabletReport?.id === item.report?.id ? "is-selected" : ""}`}
                      onClick={() => {
                        if (item.kind === "missing") {
                          startReportForJob(item.job);
                          return;
                        }
                        if (item.report?.id) onSelectReport(item.report.id);
                      }}
                    >
                      <span>
                        <strong>{item.title}</strong>
                        <em>{item.meta || "Daily report"}</em>
                      </span>
                      <span>
                        <Badge tone={item.tone}>{item.statusLabel}</Badge>
                        <b>{item.kind === "missing" ? "Start" : "Open"}</b>
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="co-field-tablet-selected" aria-label="Selected daily report">
                <div className="co-field-tablet-section-head">
                  <div>
                    <strong>Selected report</strong>
                    <span>{selectedFieldTabletReport ? jobTitle(selectedFieldTabletReport.job) : "Nothing selected"}</span>
                  </div>
                </div>
                <div className="co-field-tablet-detail-scroll">
                  <DailyReportDetailPanel
                    report={selectedFieldTabletReport}
                    proofState={selectedFieldTabletProof}
                    reportDraft={reportDraft}
                    setReportDraft={setReportDraft}
                    onSave={onSaveReport}
                    onSubmit={onSubmitReport}
                    onReview={onReviewReport}
                    onReopen={onReopenReport}
                    onArchive={onArchiveReport}
                    canView={canView}
                    canEdit={Boolean(selectedFieldTabletReport) && ((permissions.reports.canManageAll && !selectedFieldTabletReport.archivedAt) || (user?.role === "Foreman" && ["draft", "reopened"].includes(selectedFieldTabletReport.status)))}
                    canReview={canReviewActions}
                    canArchive={permissions.reports.canManageAll}
                    disabled={busy}
                    notFound={notFound}
                    onPrintReport={selectedFieldTabletReport ? () => onPrintDailyReport?.(selectedFieldTabletReport) : undefined}
                  />
                </div>
              </section>

              <section className="co-field-tablet-summary" aria-label="Daily report guardrails">
                <strong>{needsActionCount ? "Finish field drafts" : missingReportJobs.length ? "Start missing report" : "Reports are clear"}</strong>
                <span>{needsActionCount ? `${needsActionCount} draft or reopened report${needsActionCount === 1 ? "" : "s"} need field completion.` : missingReportJobs.length ? `${missingReportJobs.length} job${missingReportJobs.length === 1 ? "" : "s"} still need today's report.` : "No field report blockers in the current view."}</span>
                <em>Field tablet view: daily report work only, no leads, estimates, pricing, private notes, or admin controls.</em>
              </section>
            </div>
          </div>
        </section>
      ) : null}

      {canView ? (
        <DailyReportsOperationsBoard
          isFieldReportWorkspace={isFieldReportWorkspace}
          canCreate={canCreate}
          canReview={canReviewActions}
          permissions={permissions}
          operatingDate={operatingDate}
          fieldFocusJob={fieldFocusJob}
          fieldFocusReport={fieldFocusReport}
          fieldFocusProof={fieldFocusProof}
          visibleRows={visibleRows}
          missingReportJobs={missingReportJobs}
          proofGapReports={proofGapReports}
          submittedCount={submittedCount}
          needsActionCount={needsActionCount}
          onStartReportForJob={startReportForJob}
          onOpenReport={openReportRecord}
          onOpenReportTool={openReportTool}
          onSetFilter={setFilter}
          onSetDateFilter={setDateFilter}
          onOpenModule={openReportModule}
          proofStateByReportId={proofStateByReportId}
        />
      ) : null}

      {canViewAdvancedReporting && !isFieldReportWorkspace ? (
        <AdvancedReportsPrepPanel
          summary={advancedReportSummary}
          onSetFilter={setFilter}
          onOpenModule={openReportModule}
          onOpenReport={openAdvancedReportItem}
        />
      ) : null}

      {canView ? (
        <div className="co-reports-kpi-grid mx-auto grid w-full max-w-[1520px] min-w-0 grid-cols-1 gap-3 px-5 pb-3 sm:px-6 md:grid-cols-5 lg:px-6">
          {reportKpis.map((item) => <CommandCenterKpiCard key={item.label} item={item} />)}
        </div>
      ) : null}

      <div className="co-reports-command-layout mx-auto grid w-full max-w-[1520px] min-w-0 gap-3 px-5 pb-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-6">
        <div className="co-reports-left-stack min-w-0 space-y-3">
          <Card className="co-reports-main-board overflow-hidden">
            {canView ? (
              <>
                <div className="co-reports-board-header border-b border-slate-200 bg-white p-4">
                  <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                      <h2 className="text-base font-black uppercase tracking-[0.04em] text-slate-950">Daily Report Board</h2>
                      <p className="mt-1 text-sm font-bold leading-5 text-slate-600">Filter reports, select a field day, and keep status, crew, time, and concrete notes ready for review.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {isFieldReportWorkspace && canCreate ? <Button type="button" size="sm" onClick={() => openReportTool("create")}>Start Report</Button> : null}
                      <Button type="button" size="sm" variant="secondary" onClick={() => setFilter("All")}>All reports</Button>
                      <Button type="button" size="sm" variant="secondary" onClick={() => setFilter("Submitted")}>Review queue</Button>
                      {!isFieldReportWorkspace && canCreate ? <Button type="button" size="sm" onClick={() => openReportTool("create")}>Start Report</Button> : null}
                    </div>
                  </div>
                </div>
                <FilterBar filters={["All", "Draft", "Submitted", "Reviewed", "Reopened", "Archived"]} active={filter} setActive={setFilter} search={search} setSearch={setSearch} placeholder="Search reports..." />
                <details className="co-reports-advanced-filters border-b border-slate-200 bg-white">
                  <summary>
                    <span>Advanced filters</span>
                    <span>{[jobFilter !== "All jobs" ? jobFilter : "", creatorFilter !== "All creators" ? creatorFilter : "", dateFilter !== "All dates" ? dateFilter : ""].filter(Boolean).length || "Job, creator, date"}</span>
                  </summary>
                  <div className="co-office-filter-grid co-reports-filter-grid grid gap-3 p-3 md:grid-cols-3">
                    <SelectField label="Job" value={jobFilter} onChange={(event) => setJobFilter(event.target.value)}>
                      <option>All jobs</option>
                      {listState.jobOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </SelectField>
                    <SelectField label="Created by" value={creatorFilter} onChange={(event) => setCreatorFilter(event.target.value)}>
                      <option>All creators</option>
                      {listState.creatorOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </SelectField>
                    <SelectField label="Date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>
                      <option>All dates</option>
                      {listState.dateOptions.map((value) => <option key={value} value={value}>{value}</option>)}
                    </SelectField>
                  </div>
                </details>
                {busy && visibleRows.length === 0 ? (
                  <div className="p-5"><StateCard title="Loading reports" description="Pulling in the latest field reports for this workspace." /></div>
                ) : visibleRows.length === 0 ? (
                  <div className="p-5">
                    <StateCard title="No reports match this view" description="Start a report or adjust filters to bring field paperwork into the board." tone="slate" />
                  </div>
                ) : (
                  <DailyReportsTablePolished rows={visibleRows} selectedId={selectedReportId} onSelect={onSelectReport} onOpenDetails={() => openReportTool("details")} maxRows={visibleReportCap} proofStateByReportId={proofStateByReportId} />
                )}
                <div className="co-reports-board-footer flex min-w-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3">
                  <p className="text-sm font-bold text-slate-600">Showing {Math.min(visibleRows.length, visibleReportCap)} of {visibleRows.length} filtered reports</p>
                  <div className="co-reports-board-footer-actions">
                    {visibleRows.length > visibleReportCap ? (
                      <Button type="button" size="sm" variant="secondary" onClick={() => setVisibleReportCap((current) => current + 8)}>Show more</Button>
                    ) : null}
                    {visibleReportCap > 8 ? (
                      <Button type="button" size="sm" variant="secondary" onClick={() => setVisibleReportCap(8)}>Show less</Button>
                    ) : null}
                    <Button type="button" size="sm" variant="secondary" onClick={() => { setFilter("All"); setJobFilter("All jobs"); setCreatorFilter("All creators"); setDateFilter("All dates"); setSearch(""); setVisibleReportCap(8); }}>Clear filters</Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-5"><StateCard title="Reports unavailable" description="This role cannot access the daily reports workspace." tone="slate" /></div>
            )}
          </Card>
        </div>

        <ReportsCommandRailPolished
          report={selectedReport}
          proofState={selectedReportProofState}
          canView={canView}
          canCreate={canCreate}
          canEdit={canEdit}
          canReview={canReviewActions}
          canArchive={permissions.reports.canManageAll}
          disabled={busy}
          notFound={notFound}
          onPrintReport={selectedReport ? () => onPrintDailyReport?.(selectedReport) : undefined}
          onSubmit={onSubmitReport}
          onReview={onReviewReport}
          onReopen={onReopenReport}
          onArchive={onArchiveReport}
          onOpenTool={openReportTool}
        />
      </div>

      {isFieldReportWorkspace ? (
        <div className="co-field-mobile-tool-surface co-reports-mobile-tool-surface mx-4 mb-24 md:hidden">
          <div className="co-field-mobile-section-head">
            <span>
              <strong>Report tools</strong>
              <em>Start or finish the selected daily report without opening a drawer.</em>
            </span>
          </div>
          <div className="co-field-mobile-tool-tabs" role="tablist" aria-label="Daily report tools">
            {reportToolTabs.map((tab) => (
              <button key={tab.id} type="button" className={activeReportTool === tab.id ? "is-active" : ""} onClick={() => selectReportTool(tab.id)}>
                {tab.label}
                <span>{tab.count}</span>
              </button>
            ))}
          </div>
          <div className="co-field-mobile-tool-body">
            {activeReportTool === "create" ? (
              <DailyReportCreateCard draft={createDraft} setDraft={setCreateDraft} onCreate={onCreateReport} disabled={busy} canCreate={canCreate} jobs={jobs.filter((job) => !job.archivedAt)} />
            ) : null}
            {activeReportTool === "details" ? (
              <DailyReportDetailPanel
                report={selectedReport}
                proofState={selectedReportProofState}
                reportDraft={reportDraft}
                setReportDraft={setReportDraft}
                onSave={onSaveReport}
                onSubmit={onSubmitReport}
                onReview={onReviewReport}
                onReopen={onReopenReport}
                onArchive={onArchiveReport}
                canView={canView}
                canEdit={canEdit}
                canReview={canReviewActions}
                canArchive={permissions.reports.canManageAll}
                disabled={busy}
                notFound={notFound}
                onPrintReport={selectedReport ? () => onPrintDailyReport?.(selectedReport) : undefined}
              />
            ) : null}
          </div>
        </div>
      ) : null}

      <details
        ref={reportToolsRef}
        className="co-reports-tools-drawer mx-auto w-full max-w-[1520px] min-w-0 px-5 pb-4 sm:px-6 lg:px-8"
        open={showReportTools}
        onToggle={(event) => {
          const drawer = event.currentTarget;
          setShowReportTools(drawer.open);
          if (drawer.open && window.innerWidth < 768) {
            window.setTimeout(() => drawer.scrollIntoView?.({ behavior: "smooth", block: "start" }), 0);
          }
        }}
      >
        <summary>
          <span>
            <strong>Report Tools</strong>
            <em>Start daily reports, edit field notes, print packets, and complete review actions here.</em>
          </span>
          <span>Open tools</span>
        </summary>
        <div className="co-reports-tool-tabs mt-3 flex min-w-0 gap-2 overflow-x-auto pb-1">
          {reportToolTabs.map((tab) => (
            <button key={tab.id} type="button" className={activeReportTool === tab.id ? "is-active" : ""} onClick={() => selectReportTool(tab.id)}>
              {tab.label}
              <span>{tab.count}</span>
            </button>
          ))}
        </div>
        <div className="co-reports-tools-panel mt-3">
          {activeReportTool === "create" ? (
            <DailyReportCreateCard draft={createDraft} setDraft={setCreateDraft} onCreate={onCreateReport} disabled={busy} canCreate={canCreate} jobs={jobs.filter((job) => !job.archivedAt)} />
          ) : null}
          {activeReportTool === "details" ? (
            <DailyReportDetailPanel
              report={selectedReport}
              proofState={selectedReportProofState}
              reportDraft={reportDraft}
              setReportDraft={setReportDraft}
              onSave={onSaveReport}
              onSubmit={onSubmitReport}
              onReview={onReviewReport}
              onReopen={onReopenReport}
              onArchive={onArchiveReport}
              canView={canView}
              canEdit={canEdit}
              canReview={canReviewActions}
              canArchive={permissions.reports.canManageAll}
              disabled={busy}
              notFound={notFound}
              onPrintReport={selectedReport ? () => onPrintDailyReport?.(selectedReport) : undefined}
            />
          ) : null}
        </div>
      </details>
    </div>
  );
}

export function ReportsPage(props) {
  return <ReportsPagePolished {...props} />;
}

function ReportsPageLegacy({
  user,
  permissions,
  reports,
  jobs,
  users,
  filter,
  setFilter,
  search,
  setSearch,
  jobFilter,
  setJobFilter,
  creatorFilter,
  setCreatorFilter,
  dateFilter,
  setDateFilter,
  selectedReportId,
  onSelectReport,
  selectedReport,
  reportDraft,
  setReportDraft,
  createDraft,
  setCreateDraft,
  onCreateReport,
  onSaveReport,
  onSubmitReport,
  onReviewReport,
  onReopenReport,
  onArchiveReport,
  onPrintDailyReport,
  busy,
  reportRouteRequested,
}) {
  const canView = permissions.reports.canView;
  const canCreate = permissions.reports.canCreate;
  const listState = useMemo(() => deriveDailyReportListState(reports), [reports]);
  const visibleRows = useMemo(() => filterDailyReports(reports, {
    status: filter,
    query: search,
    jobId: jobFilter,
    createdBy: creatorFilter,
    date: dateFilter,
  }), [creatorFilter, dateFilter, filter, jobFilter, reports, search]);
  const notFound = Boolean(reportRouteRequested) && !selectedReport;
  const canEdit = Boolean(selectedReport) && ((permissions.reports.canManageAll && !selectedReport.archivedAt) || (user?.role === "Foreman" && ["draft", "reopened"].includes(selectedReport.status)));
  const canReviewActions = permissions.reports.canReview;
  const latestVisibleReport = visibleRows[0] || null;
  const reportLogSummary = `${visibleRows.length} reports${latestVisibleReport ? ` / Latest ${reportStatusLabel(latestVisibleReport.status)}` : ""}`;
  const reportKpis = [
    { label: "Visible Reports", value: visibleRows.length, helper: "Matching current filters", icon: "document" },
    { label: "Submitted", value: visibleRows.filter((report) => report.status === "submitted").length, helper: "Waiting office review", icon: "clipboard" },
    { label: "Reviewed", value: visibleRows.filter((report) => report.status === "reviewed").length, helper: "Closed for field review", icon: "check" },
    { label: "Needs Action", value: visibleRows.filter((report) => ["draft", "reopened"].includes(report.status)).length, helper: "Drafts or reopened reports", icon: "alert" },
  ];

  return (
    <div>
      <PageHeader eyebrow={permissions.reports.canManageAll ? "Field Ops" : "Field Workspace"} title="Daily Reports" description="Capture crew notes, job progress, weather, and pour details in one daily field report." actions={<Badge tone="blue">{canView ? visibleRows.length : 0} reports</Badge>} />
      {canView ? <ModuleKpiStrip items={reportKpis} /> : null}
      <div className="mx-auto grid w-full max-w-[1600px] min-w-0 gap-4 px-5 sm:px-6 lg:px-8">
        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start xl:grid-cols-[minmax(0,1fr)_420px]">
          {canView ? (
            <DailyReportMobileAccordionCard title="Report log" summary={reportLogSummary} badge={<Badge tone="blue">{visibleRows.length}</Badge>}>
              <div className="grid gap-2.5">
                <FilterBar filters={["All", "Draft", "Submitted", "Reviewed", "Reopened", "Archived"]} active={filter} setActive={setFilter} search={search} setSearch={setSearch} placeholder="Search reports..." />
                <DailyReportMobileFieldGroup title="Filters" summary="Job, creator, and date">
                  <SelectField label="Job" value={jobFilter} onChange={(event) => setJobFilter(event.target.value)}>
                    <option>All jobs</option>
                    {listState.jobOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </SelectField>
                  <SelectField label="Created by" value={creatorFilter} onChange={(event) => setCreatorFilter(event.target.value)}>
                    <option>All creators</option>
                    {listState.creatorOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </SelectField>
                  <SelectField label="Date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>
                    <option>All dates</option>
                    {listState.dateOptions.map((value) => <option key={value} value={value}>{value}</option>)}
                  </SelectField>
                </DailyReportMobileFieldGroup>
                {busy && visibleRows.length === 0 ? (
                  <StateCard title="Loading reports" description="Pulling in the latest field reports for this workspace." />
                ) : visibleRows.length === 0 ? (
                  <StateCard title="No reports yet" description="Start the first daily report, then this log will show drafts, submitted reports, and reviewed reports." tone="slate" />
                ) : (
                  <div className="space-y-2.5">
                    {visibleRows.map((report) => <DailyReportMobileCard key={report.id} report={report} selected={report.id === selectedReportId} onSelect={onSelectReport} />)}
                  </div>
                )}
              </div>
            </DailyReportMobileAccordionCard>
          ) : (
            <DailyReportMobileAccordionCard title="Report log" summary="Reports unavailable">
              <StateCard title="Reports unavailable" description="This role cannot access the daily reports workspace." tone="slate" />
            </DailyReportMobileAccordionCard>
          )}
          <Card className="hidden self-start overflow-hidden md:block">
            {canView ? (
              <>
                <div className="border-b border-blue-100 bg-white p-5">
                  <SectionHeader title="Report log" description="Filter daily reports by status, job, creator, or report date." />
                </div>
                <FilterBar filters={["All", "Draft", "Submitted", "Reviewed", "Reopened", "Archived"]} active={filter} setActive={setFilter} search={search} setSearch={setSearch} placeholder="Search job, creator, weather, work performed..." />
                <div className="grid gap-3 border-b border-blue-100 bg-blue-50/40 p-3 md:grid-cols-3">
                  <SelectField label="Job" value={jobFilter} onChange={(event) => setJobFilter(event.target.value)}>
                    <option>All jobs</option>
                    {listState.jobOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </SelectField>
                  <SelectField label="Created by" value={creatorFilter} onChange={(event) => setCreatorFilter(event.target.value)}>
                    <option>All creators</option>
                    {listState.creatorOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </SelectField>
                  <SelectField label="Date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>
                    <option>All dates</option>
                    {listState.dateOptions.map((value) => <option key={value} value={value}>{value}</option>)}
                  </SelectField>
                </div>
                {busy && visibleRows.length === 0 ? (
                  <div className="p-5"><StateCard title="Loading reports" description="Pulling in the latest field reports for this workspace." /></div>
                ) : visibleRows.length === 0 ? (
                  <div className="p-5">
                    <div className="rounded-3xl border border-dashed border-blue-200 bg-gradient-to-br from-blue-50/80 to-white p-6 text-center">
                      <p className="text-sm font-black text-slate-950">No reports yet</p>
                      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">Start the first daily report from the panel on the right, then use this log to review drafts, submitted reports, and printed packets.</p>
                    </div>
                  </div>
                ) : (
                  <DailyReportsTable rows={visibleRows} selectedId={selectedReportId} onSelect={onSelectReport} />
                )}
              </>
            ) : (
              <div className="p-5"><StateCard title="Reports unavailable" description="This role cannot access the daily reports workspace." tone="slate" /></div>
            )}
          </Card>
          <div className="min-w-0 self-start">
            <DailyReportCreateCard draft={createDraft} setDraft={setCreateDraft} onCreate={onCreateReport} disabled={busy} canCreate={canCreate} jobs={jobs.filter((job) => !job.archivedAt)} />
          </div>
        </div>
        <DailyReportDetailPanel
          report={selectedReport}
          reportDraft={reportDraft}
          setReportDraft={setReportDraft}
          onSave={onSaveReport}
          onSubmit={onSubmitReport}
          onReview={onReviewReport}
          onReopen={onReopenReport}
          onArchive={onArchiveReport}
          canView={canView}
          canEdit={canEdit}
          canReview={canReviewActions}
          canArchive={permissions.reports.canManageAll}
          disabled={busy}
          notFound={notFound}
          onPrintReport={selectedReport ? () => onPrintDailyReport?.(selectedReport) : undefined}
        />
      </div>
    </div>
  );
}
