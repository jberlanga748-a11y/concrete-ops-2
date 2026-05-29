import { useEffect, useMemo, useRef, useState } from "react";

import { Badge, Button, Card, Icon, PageHeader, SectionHeader, StateCard } from "./app-shell-components";
import { ModuleKpiStrip } from "./command-center-route-components";
import { jobTitle } from "./job-utils";
import { workCategoryLabel } from "./time-category-utils";
import { buildTimeTrackingSupportContext, deriveCrewWeeklySummary, deriveTimeJobCostingReadiness, deriveTimeWorkspace, formatMinutes, timeLocationEvidencePayload } from "./time-utils";
import { ActiveTimeCard, RecentTimeEntriesCard, TimeCommandRailPolished, TimeCorrectionPanel, TimeDesktopCommandShell, TimeEntriesTable, TimeEntriesTablePolished, TimeEntryCard, TimeKpiCardPolished, TimeLocationCaptureControl, TimeMobileAccordionCard, TimeStatusBadge, TimeSummaryMetricsPolished, WeekSummaryCard } from "./time-route-components";
import { normalizeTimeLocationEvidencePolicy } from "../shared/permissions";

function useDesktopCommandViewport(minWidth = 1024) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return true;
    return window.matchMedia(`(min-width: ${minWidth}px)`).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
    const mediaQuery = window.matchMedia(`(min-width: ${minWidth}px)`);
    const update = () => setMatches(mediaQuery.matches);
    update();
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", update);
      return () => mediaQuery.removeEventListener("change", update);
    }
    mediaQuery.addListener(update);
    return () => mediaQuery.removeListener(update);
  }, [minWidth]);

  return matches;
}
function isSameLocalDate(value, compareDate = new Date()) {
  if (!value) return false;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.getFullYear() === compareDate.getFullYear()
    && parsed.getMonth() === compareDate.getMonth()
    && parsed.getDate() === compareDate.getDate();
}

const EMPTY_TIME_LOCATION_EVIDENCE = {
  latitude: null,
  longitude: null,
  locationAccuracy: null,
  locationCapturedAt: "",
  locationUnavailableReason: "",
};

function TimeFieldMobileCommand({
  workspace,
  boardRows,
  boardSummary,
  showUserColumn,
  permissions,
  busy,
  onClockIn,
  onClockOut,
  onStartBreak,
  onEndBreak,
  locationPolicy,
}) {
  const timeLocationPolicy = normalizeTimeLocationEvidencePolicy(locationPolicy);
  const [clockInLocation, setClockInLocation] = useState(EMPTY_TIME_LOCATION_EVIDENCE);
  const [clockOutLocation, setClockOutLocation] = useState(EMPTY_TIME_LOCATION_EVIDENCE);
  const activeEntry = workspace.activeEntry;
  const todayEntries = workspace.ownEntries.filter((entry) => isSameLocalDate(entry.clockInAt));
  const todayMinutes = todayEntries.reduce((sum, entry) => sum + Number(entry.totalMinutes || 0), 0);
  const todayBreakMinutes = todayEntries.reduce((sum, entry) => sum + Number(entry.breakMinutes || 0), 0);
  const allowedCategories = workspace.allowedCategories || [];
  const availableJobs = workspace.availableJobs || [];
  const quickCategory = allowedCategories.includes("job") ? "job" : allowedCategories[0] || "";
  const quickJob = quickCategory === "job" ? availableJobs[0] : null;
  const canQuickClockIn = Boolean(
    permissions.time.canManageOwn
      && !activeEntry
      && quickCategory
      && (quickCategory !== "job" || quickJob?.id),
  );
  const focusTitle = activeEntry?.jobTitle
    || (quickCategory === "job" ? (quickJob ? jobTitle(quickJob) : "Assigned job needed") : workCategoryLabel(quickCategory))
    || "Assigned job needed";
  const focusSubline = activeEntry?.address
    || activeEntry?.notes
    || quickJob?.address
    || quickJob?.customer
    || (activeEntry ? workCategoryLabel(activeEntry.workCategory) : "Pick a job or category from details");
  const queueRows = [
    ...(activeEntry ? [activeEntry] : []),
    ...boardRows.filter((entry) => entry.id !== activeEntry?.id),
  ].slice(0, 3);
  const actionTone = activeEntry?.status === "on_break" ? "On break" : activeEntry ? "Clocked in" : canQuickClockIn ? "Ready" : "Needs assignment";

  function handleQuickClockIn() {
    if (!canQuickClockIn) return;
    onClockIn({
      workCategory: quickCategory,
      jobId: quickCategory === "job" ? quickJob.id : "",
      notes: "",
      ...timeLocationEvidencePayload("clockIn", clockInLocation),
    });
    setClockInLocation(EMPTY_TIME_LOCATION_EVIDENCE);
  }

  function handleClockOut() {
    if (!activeEntry?.id) return;
    onClockOut(activeEntry.id, timeLocationEvidencePayload("clockOut", clockOutLocation));
  }

  return (
    <section className="co-time-field-mobile-command" aria-label="Field time command">
      <div className="co-time-field-mobile-hero">
        <div className="co-time-field-mobile-hero-head">
          <span>
            <em>{activeEntry ? "Current clock" : "Next clock"}</em>
            <strong>{activeEntry ? "Time is running" : "Ready for time"}</strong>
          </span>
          {activeEntry ? <TimeStatusBadge status={activeEntry.status} /> : <Badge tone={canQuickClockIn ? "green" : "amber"}>{actionTone}</Badge>}
        </div>
        <div className="co-time-field-mobile-job">
          <p>{focusTitle}</p>
          <span>{focusSubline}</span>
        </div>
        <div className="co-time-field-mobile-facts" aria-label="Time facts">
          <span><em>Today</em><strong>{formatMinutes(todayMinutes)}</strong></span>
          <span><em>Breaks</em><strong>{formatMinutes(todayBreakMinutes)}</strong></span>
          <span><em>Week</em><strong>{formatMinutes(workspace.weeklySummary.totalMinutes || 0)}</strong></span>
          <span><em>Visible</em><strong>{boardRows.length}</strong></span>
        </div>
        <div className="co-time-field-mobile-actions">
          {activeEntry ? (
            <>
              {activeEntry.status === "on_break" ? (
                <Button type="button" className="co-time-field-mobile-primary" onClick={() => onEndBreak(activeEntry.id)} disabled={busy}>
                  <Icon name="clock" />
                  Resume
                </Button>
              ) : (
                <Button type="button" className="co-time-field-mobile-primary" onClick={() => onStartBreak(activeEntry.id)} disabled={busy}>
                  <Icon name="clock" />
                  Break
                </Button>
              )}
              <Button type="button" className="co-time-field-mobile-secondary" variant="secondary" onClick={handleClockOut} disabled={busy}>
                <Icon name="check" />
                Clock out
              </Button>
            </>
          ) : (
            <Button type="button" className="co-time-field-mobile-primary" onClick={handleQuickClockIn} disabled={busy || !canQuickClockIn}>
              <Icon name="clock" />
              Clock in now
            </Button>
          )}
        </div>
        <div className="mt-3">
          <TimeLocationCaptureControl
            evidence={activeEntry ? clockOutLocation : clockInLocation}
            onChange={activeEntry ? setClockOutLocation : setClockInLocation}
            disabled={busy}
            action={activeEntry ? "clock-out" : "clock-in"}
            locationPolicy={timeLocationPolicy}
          />
        </div>
      </div>

      <details className="co-time-field-mobile-adjust">
        <summary>
          <span>
            <strong>{activeEntry ? "Clock details" : "Change job/category"}</strong>
            <em>{activeEntry ? "Status, break, and entry details" : focusTitle}</em>
          </span>
          <b />
        </summary>
        <div className="co-time-field-mobile-adjust-body">
          <ActiveTimeCard
            activeEntry={activeEntry}
            availableJobs={availableJobs}
            allowedCategories={allowedCategories}
            onClockIn={onClockIn}
            onClockOut={onClockOut}
            onStartBreak={onStartBreak}
            onEndBreak={onEndBreak}
            disabled={busy}
            compactMobile
            locationPolicy={timeLocationPolicy}
          />
        </div>
      </details>

      <div className="co-time-field-mobile-queue" aria-label="Top visible time entries">
        <div className="co-time-field-mobile-queue-head">
          <span>
            <strong>{showUserColumn ? "Crew time" : "My recent time"}</strong>
            <em>Top {Math.min(queueRows.length, 3)} of {boardRows.length} visible</em>
          </span>
          <b>{formatMinutes(boardSummary.totalMinutes || 0)}</b>
        </div>
        <div className="co-time-field-mobile-rows">
          {queueRows.length === 0 ? (
            <StateCard title="No time entries yet" description="Clock into the right job to start today's time." tone="slate" />
          ) : queueRows.map((entry) => (
            <div key={entry.id} className="co-time-field-mobile-row">
              <span>
                <strong>{entry.jobTitle || workCategoryLabel(entry.workCategory)}</strong>
                <em>{showUserColumn ? `${entry.userName} / ${entry.userRole || "Field user"}` : workCategoryLabel(entry.workCategory)}</em>
              </span>
              <span>
                <TimeStatusBadge status={entry.status} />
                <b>{entry.status === "completed" ? formatMinutes(entry.totalMinutes) : "In progress"}</b>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
export function TimePage({
  user,
  permissions,
  rows,
  jobs,
  dailyReports,
  uploads,
  deliveryTickets,
  companySettings,
  selectedTimeEntryId,
  onSelectTimeEntry,
  selectedTimeEntry,
  timeEditDraft,
  setTimeEditDraft,
  onSaveTimeEntry,
  onReviewTimePresence,
  onClockIn,
  onClockOut,
  onStartBreak,
  onEndBreak,
  onOpenSupport,
  busy,
}) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const timeLocationPolicy = normalizeTimeLocationEvidencePolicy(companySettings?.timeLocationEvidencePolicy);
  const workspace = useMemo(() => deriveTimeWorkspace(safeRows, jobs, user?.id, permissions.time.allowedCategories || []), [jobs, permissions.time.allowedCategories, safeRows, user?.id]);
  const clockedInCount = safeRows.filter((entry) => entry.status !== "completed").length;
  const completedCount = safeRows.filter((entry) => entry.status === "completed").length;
  const onBreakCount = safeRows.filter((entry) => entry.status === "on_break").length;
  const allWeeklySummary = useMemo(() => deriveCrewWeeklySummary(safeRows), [safeRows]);
  const crewWeeklySummary = useMemo(() => deriveCrewWeeklySummary(safeRows, { excludeUserId: user?.id }), [safeRows, user?.id]);
  const jobCostingReadiness = useMemo(() => deriveTimeJobCostingReadiness(safeRows, jobs, {
    reports: dailyReports,
    uploads,
    deliveryTickets,
  }), [dailyReports, deliveryTickets, jobs, safeRows, uploads]);
  const canViewAll = permissions.time.canViewAll;
  const canViewCrew = permissions.time.canViewCrew && !canViewAll;
  const isOwnOnly = !canViewAll && !canViewCrew;
  const boardSummary = canViewAll ? allWeeklySummary : canViewCrew ? crewWeeklySummary : workspace.weeklySummary;
  const boardRows = isOwnOnly ? workspace.sortedEntries : safeRows;
  const visibleRowCap = canViewAll ? 8 : 6;
  const showUserColumn = !isOwnOnly;
  const pageEyebrow = canViewAll ? "Time" : canViewCrew ? "Field Time" : "My Time";
  const pageTitle = canViewAll ? "Time Entries" : canViewCrew ? "Crew Time" : "My Time";
  const pageDescription = canViewAll
    ? "Review field time, clock your own work, and correct timestamps from one operator time board."
    : canViewCrew
      ? "Review assigned crew time without exposing payroll, rates, pricing, or office-only data."
      : "Track your assigned work and keep your weekly time clear for the office.";
  const boardTitle = canViewAll ? "Time Operations Board" : canViewCrew ? "Crew Time Board" : "My Time Board";
  const boardDescription = canViewAll
    ? "Select an entry to inspect it in the rail, keep corrections contained, and watch active time."
    : canViewCrew
      ? "Crew entries stay scoped to assigned work and field-safe details."
      : "Your own entries stay focused on clock-in status, breaks, and weekly totals.";
  const timeKpis = [
    { label: "Visible Entries", value: boardRows.length, rawValue: boardRows.length, helper: "Role-scoped time log", icon: "clock", tone: "blue" },
    { label: "Clocked In", value: clockedInCount, rawValue: clockedInCount, helper: "Active or on break now", icon: "users", tone: "green" },
    canViewAll
      ? { label: "Proof Gaps", value: jobCostingReadiness.jobsWithGaps, rawValue: jobCostingReadiness.jobsWithGaps, helper: "Jobs needing proof review", icon: "alert", tone: jobCostingReadiness.jobsWithGaps ? "amber" : "green" }
      : { label: "Completed", value: completedCount, rawValue: completedCount, helper: "Closed visible entries", icon: "check", tone: completedCount ? "green" : "slate" },
    { label: "My Week", value: formatMinutes(workspace.weeklySummary.totalMinutes || 0), rawValue: workspace.weeklySummary.totalMinutes || 0, helper: "Your visible hours", icon: "clipboard", tone: "amber" },
  ];
  const mobileSnapshotItems = [
    { label: "Entries", value: boardRows.length },
    { label: "Active", value: clockedInCount },
    { label: "Breaks", value: formatMinutes(boardSummary.breakMinutes || 0) },
    { label: "Week", value: formatMinutes(boardSummary.totalMinutes || 0) },
  ];
  const canOpenTimeSupport = Boolean(permissions?.support?.canView && typeof onOpenSupport === "function");
  const clockHeroRef = useRef(null);
  const timeBoardRef = useRef(null);
  const isDesktopTimeCommandViewport = useDesktopCommandViewport(1180);

  function jumpToTimeSection(ref) {
    window.setTimeout(() => ref.current?.scrollIntoView?.({ behavior: "smooth", block: "start" }), 0);
  }

  function requestTimeSupportReview() {
    if (!canOpenTimeSupport) return;
    onOpenSupport(buildTimeTrackingSupportContext({
      user,
      permissions,
      workspace,
      boardRows,
      boardSummary,
    }));
  }

  const timeCommandItems = [
    {
      label: "Clocked in",
      value: clockedInCount,
      helper: clockedInCount ? "Active field time is running" : "No visible active time",
      tone: clockedInCount ? "green" : "slate",
      action: "Open board",
      onClick: () => jumpToTimeSection(timeBoardRef),
    },
    {
      label: "On break",
      value: onBreakCount,
      helper: onBreakCount ? "Break timer needs visibility" : "No active breaks",
      tone: onBreakCount ? "amber" : "green",
      action: "Review breaks",
      onClick: () => jumpToTimeSection(timeBoardRef),
    },
    {
      label: "Visible week",
      value: formatMinutes(boardSummary.totalMinutes || 0),
      helper: `${boardRows.length} role-scoped entries`,
      tone: boardSummary.totalMinutes ? "orange" : "slate",
      action: "Open details",
      onClick: () => jumpToTimeSection(timeBoardRef),
    },
    {
      label: "My clock",
      value: workspace.activeEntry ? "Active" : "Ready",
      helper: permissions.time.canManageOwn
        ? workspace.activeEntry ? "Your own timer is running" : "Ready for a clean clock-in"
        : "Clock controls are role-scoped",
      tone: workspace.activeEntry ? "green" : permissions.time.canManageOwn ? "orange" : "slate",
      action: permissions.time.canManageOwn ? "Open clock" : "Review board",
      onClick: () => jumpToTimeSection(permissions.time.canManageOwn ? clockHeroRef : timeBoardRef),
    },
  ];
  const timeNextAction = onBreakCount
    ? "Review active breaks"
    : clockedInCount
      ? "Watch active field time"
      : permissions.time.canManageOwn
        ? "Clock into the right job"
        : "Time board is clear";
  const timeNextDetail = onBreakCount
    ? `${onBreakCount} visible entr${onBreakCount === 1 ? "y is" : "ies are"} currently on break.`
    : clockedInCount
      ? `${clockedInCount} visible entr${clockedInCount === 1 ? "y is" : "ies are"} active or on break.`
      : permissions.time.canManageOwn
        ? "Use the clock card to start clean job-linked time."
        : "No active visible time needs office attention.";
  const tabletTimeRows = boardRows.slice(0, Math.min(boardRows.length, 6));
  const selectedTabletTimeEntry = selectedTimeEntry || tabletTimeRows[0] || null;
  const tabletTimeTitle = canViewAll ? "Time Command" : canViewCrew ? "Crew Time" : "My Time";
  const tabletTimeDescription = canViewAll
    ? "Clock first, review active time, and keep corrections in one tablet pass."
    : canViewCrew
      ? "Review crew time from field-safe cards with no payroll, pricing, or office controls."
      : "Clock your assigned work and keep today's time clean.";
  const tabletGuardrail = canViewAll
    ? "Office view: corrections stay permission-gated and no pricing or payroll data is shown."
    : canViewCrew
      ? "Foreman view: crew time stays limited to field-safe work details."
      : "Employee view: only your assigned work and your time controls are visible.";

  if (isDesktopTimeCommandViewport) {
    return (
      <div className="co-office-page co-time-page co-time-shell-page" data-field-workspace={canViewAll ? "false" : "true"}>
        <TimeDesktopCommandShell
          eyebrow={pageEyebrow}
          title={pageTitle}
          description={pageDescription}
          kpis={timeKpis}
          rows={boardRows}
          boardSummary={boardSummary}
          workspace={workspace}
          jobCostingReadiness={jobCostingReadiness}
          permissions={permissions}
          selectedEntry={selectedTimeEntry}
          selectedEntryId={selectedTimeEntryId}
          onSelectEntry={onSelectTimeEntry}
          timeEditDraft={timeEditDraft}
          setTimeEditDraft={setTimeEditDraft}
          onSaveTimeEntry={onSaveTimeEntry}
          onReviewTimePresence={onReviewTimePresence}
          onClockIn={onClockIn}
          onClockOut={onClockOut}
          onStartBreak={onStartBreak}
          onEndBreak={onEndBreak}
          busy={busy}
          showUser={showUserColumn}
          canOpenTimeSupport={canOpenTimeSupport}
          onOpenTimeSupport={requestTimeSupportReview}
          locationPolicy={timeLocationPolicy}
        />
      </div>
    );
  }

  return (
    <div className="co-office-page co-time-page" data-field-workspace={canViewAll ? "false" : "true"}>
      <PageHeader
        eyebrow={pageEyebrow}
        title={pageTitle}
        description={pageDescription}
        actions={
          <div className="co-time-header-status flex flex-wrap gap-2">
            <Badge tone={clockedInCount ? "blue" : "slate"}>{clockedInCount} clocked in</Badge>
            <Badge tone={onBreakCount ? "amber" : "green"}>{onBreakCount} on break</Badge>
            <Badge tone="blue">{boardRows.length} entries</Badge>
            {canOpenTimeSupport ? (
              <Button type="button" size="sm" variant="secondary" onClick={requestTimeSupportReview}>
                <Icon name="help" />Time Support
              </Button>
            ) : null}
          </div>
        }
      />

      {!canViewAll ? (
        <TimeFieldMobileCommand
          workspace={workspace}
          boardRows={boardRows}
          boardSummary={boardSummary}
          showUserColumn={showUserColumn}
          permissions={permissions}
          busy={busy}
          onClockIn={onClockIn}
          onClockOut={onClockOut}
          onStartBreak={onStartBreak}
          onEndBreak={onEndBreak}
          locationPolicy={timeLocationPolicy}
        />
      ) : null}

      <section className="co-time-tablet-only mx-auto w-full max-w-[1520px] min-w-0 px-4 pb-4 sm:px-5" aria-label="Tablet time command">
        <div className="co-time-tablet-shell">
          <div className="co-time-tablet-head">
            <div className="min-w-0">
              <p>Tablet time</p>
              <h2>{tabletTimeTitle}</h2>
              <span>{tabletTimeDescription}</span>
            </div>
            <Badge tone={workspace.activeEntry ? "green" : "slate"}>{workspace.activeEntry ? "Clock active" : "Clock ready"}</Badge>
          </div>

          <div className="co-time-tablet-kpis" aria-label="Time status summary">
            {timeKpis.slice(0, 4).map((item) => (
              <div key={item.label} className="co-time-tablet-kpi" data-tone={item.tone}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <em>{item.helper}</em>
              </div>
            ))}
          </div>

          <div className="co-time-tablet-grid">
            <section className="co-time-tablet-clock" aria-label="Clock controls">
              {permissions.time.canManageOwn ? (
                <ActiveTimeCard
                  activeEntry={workspace.activeEntry}
                  availableJobs={workspace.availableJobs}
                  allowedCategories={workspace.allowedCategories}
                  onClockIn={onClockIn}
                  onClockOut={onClockOut}
                  onStartBreak={onStartBreak}
                  onEndBreak={onEndBreak}
                  disabled={busy}
                  description="Start or stop job-linked time from the top of the tablet."
                  heroClock
                  locationPolicy={timeLocationPolicy}
                />
              ) : (
                <Card className="p-4">
                  <SectionHeader title="Clock controls are not available" description="Your role can review visible time, but cannot start or stop a personal clock from this screen." />
                  <StateCard title="Read-only time view" description="Visible time remains role-scoped and field-safe." tone="slate" />
                </Card>
              )}
            </section>

            <section className="co-time-tablet-queue" aria-label="Visible time queue">
              <div className="co-time-tablet-section-head">
                <div>
                  <strong>Time queue</strong>
                  <span>{tabletTimeRows.length} of {boardRows.length} visible entries</span>
                </div>
                <Badge tone="slate">{permissions.time.canCorrect ? "Corrections on" : "Read-only"}</Badge>
              </div>
              <div className="co-time-tablet-list">
                {tabletTimeRows.length === 0 ? (
                  <StateCard title="No visible time entries" description={permissions.time.canManageOwn ? "Use the clock card to start the first entry." : "Entries appear here when visible crews track time."} tone="slate" />
                ) : tabletTimeRows.map((entry) => {
                  const selected = selectedTabletTimeEntry?.id === entry.id;
                  const totalLabel = entry.status === "completed" ? formatMinutes(entry.totalMinutes) : "In progress";

                  return (
                    <button
                      key={entry.id}
                      type="button"
                      className={`co-time-tablet-row co-focus-ring ${selected ? "is-selected" : ""}`}
                      onClick={() => onSelectTimeEntry(entry.id)}
                    >
                      <span>
                        <strong>{entry.jobTitle || workCategoryLabel(entry.workCategory)}</strong>
                        <em>{showUserColumn ? `${entry.userName} / ${entry.userRole || "Field user"}` : workCategoryLabel(entry.workCategory)}</em>
                      </span>
                      <span>
                        <TimeStatusBadge status={entry.status} />
                        <b>{totalLabel}</b>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="co-time-tablet-selected" aria-label="Selected time entry">
              <div className="co-time-tablet-section-head">
                <div>
                  <strong>Selected entry</strong>
                  <span>{selectedTabletTimeEntry ? selectedTabletTimeEntry.id : "Nothing selected"}</span>
                </div>
              </div>
              <div className="co-time-tablet-detail-scroll">
                {selectedTabletTimeEntry ? (
                  <>
                    <TimeEntryCard entry={selectedTabletTimeEntry} showUser={showUserColumn} compact />
                    <TimeCorrectionPanel
                      entry={selectedTabletTimeEntry}
                      draft={timeEditDraft}
                      setDraft={setTimeEditDraft}
                      onSave={onSaveTimeEntry}
                      onReviewPresence={onReviewTimePresence}
                      disabled={busy}
                      canCorrect={permissions.time.canCorrect}
                      compactMobile
                    />
                  </>
                ) : (
                  <StateCard title="No entry selected" description="Choose a time card to review status, breaks, notes, and correction availability." tone="slate" />
                )}
              </div>
            </section>

            <section className="co-time-tablet-summary" aria-label="Tablet time guardrails">
              <TimeSummaryMetricsPolished summary={boardSummary} activeCount={clockedInCount} label={isOwnOnly ? "My week" : "Visible week"} />
              <div className="co-time-tablet-safe-note">
                <strong>{timeNextAction}</strong>
                <span>{timeNextDetail}</span>
                <em>{tabletGuardrail}</em>
              </div>
            </section>
          </div>
        </div>
      </section>

      {permissions.time.canManageOwn ? (
        <div ref={clockHeroRef} className="co-time-clock-hero mx-auto w-full max-w-[1520px] min-w-0 px-5 pb-3 sm:px-6 lg:px-6">
          <ActiveTimeCard
            activeEntry={workspace.activeEntry}
            availableJobs={workspace.availableJobs}
            allowedCategories={workspace.allowedCategories}
            onClockIn={onClockIn}
            onClockOut={onClockOut}
            onStartBreak={onStartBreak}
            onEndBreak={onEndBreak}
            disabled={busy}
            description="Clock into the right job fast, add a short note when needed, and keep field time clean for the office."
            compactMobile
            heroClock
            locationPolicy={timeLocationPolicy}
          />
        </div>
      ) : null}

      {canViewAll ? (
        <div className="co-time-command-band mx-auto w-full max-w-[1520px] min-w-0 px-5 pb-3 sm:px-6 lg:px-6">
          <Card className="co-time-command-card overflow-hidden">
            <div className="co-time-command-shell">
              <div className="co-time-command-main">
                <div className="co-time-command-header">
                  <div className="min-w-0">
                    <p className="co-time-command-eyebrow">Time command</p>
                    <h2>Active crews, breaks, and weekly time in one office pass</h2>
                    <p>Keep field time readable for operations without exposing rates, pricing, or payroll controls.</p>
                  </div>
                  <div className="co-time-command-actions">
                    <Button type="button" variant="secondary" onClick={() => jumpToTimeSection(timeBoardRef)}>Open board</Button>
                    {permissions.time.canManageOwn ? <Button type="button" variant="secondary" onClick={() => jumpToTimeSection(clockHeroRef)}>Open clock</Button> : null}
                    {canOpenTimeSupport ? <Button type="button" onClick={requestTimeSupportReview}>Time support</Button> : null}
                  </div>
                </div>
                <div className="co-time-command-metrics">
                  <button type="button" className="co-focus-ring" data-tone="orange" onClick={() => jumpToTimeSection(timeBoardRef)}>
                    <span>Visible entries</span>
                    <strong>{boardRows.length}</strong>
                    <em>Role-scoped time board</em>
                  </button>
                  <button type="button" className="co-focus-ring" data-tone={clockedInCount ? "green" : "slate"} onClick={() => jumpToTimeSection(timeBoardRef)}>
                    <span>Clocked in</span>
                    <strong>{clockedInCount}</strong>
                    <em>Active or on break now</em>
                  </button>
                  <button type="button" className="co-focus-ring" data-tone={onBreakCount ? "amber" : "green"} onClick={() => jumpToTimeSection(timeBoardRef)}>
                    <span>On break</span>
                    <strong>{onBreakCount}</strong>
                    <em>Break timers visible</em>
                  </button>
                  <button type="button" className="co-focus-ring" data-tone={completedCount ? "green" : "slate"} onClick={() => jumpToTimeSection(timeBoardRef)}>
                    <span>Completed</span>
                    <strong>{completedCount}</strong>
                    <em>Closed visible entries</em>
                  </button>
                  <button type="button" className="co-focus-ring" data-tone={jobCostingReadiness.tone} onClick={() => jumpToTimeSection(timeBoardRef)}>
                    <span>Proof gaps</span>
                    <strong>{jobCostingReadiness.jobsWithGaps}</strong>
                    <em>{jobCostingReadiness.nextAction}</em>
                  </button>
                </div>
                <div className="co-time-command-queues">
                  {timeCommandItems.slice(0, 3).map((item) => (
                    <button key={item.label} type="button" className="co-focus-ring" data-tone={item.tone} onClick={item.onClick}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                      <em>{item.helper}</em>
                      <b>{item.action}</b>
                    </button>
                  ))}
                </div>
              </div>
              <aside className="co-time-command-rail" aria-label="Time assistant">
                <div className="co-time-command-rail-head">
                  <span><Icon name="clock" /></span>
                  <div className="min-w-0">
                    <strong>Time Assistant</strong>
                    <p>Manual time review</p>
                  </div>
                </div>
                <div className="co-time-command-priority">
                  <span>Next best action</span>
                  <strong>{timeNextAction}</strong>
                  <p>{timeNextDetail}</p>
                </div>
                <div className="co-time-command-list">
                  {timeCommandItems.map((item) => (
                    <button key={item.label} type="button" className="co-focus-ring" data-tone={item.tone} onClick={item.onClick}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                      <em>{item.helper}</em>
                      <b>{item.action}</b>
                    </button>
                  ))}
                </div>
                <div className="co-time-command-rail-actions">
                  <button type="button" className="co-focus-ring" onClick={() => jumpToTimeSection(timeBoardRef)}><Icon name="check" />Review board</button>
                  {permissions.time.canManageOwn ? <button type="button" className="co-focus-ring" onClick={() => jumpToTimeSection(clockHeroRef)}><Icon name="clock" />Open clock</button> : null}
                </div>
              </aside>
            </div>
          </Card>
        </div>
      ) : null}

      <div className="co-time-kpi-grid mx-auto grid w-full max-w-[1520px] min-w-0 grid-cols-1 gap-3 px-5 pb-3 sm:px-6 md:grid-cols-4 lg:px-6">
        {timeKpis.map((item) => <TimeKpiCardPolished key={item.label} item={item} />)}
      </div>

      <div className="co-time-mobile-snapshot mx-auto w-full max-w-[1520px] min-w-0 px-4 pb-3 md:hidden">
        {mobileSnapshotItems.map((item) => (
          <div key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>

      <div className="co-time-command-layout mx-auto grid w-full max-w-[1520px] min-w-0 gap-3 px-5 pb-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-6">
        <div className="co-time-left-stack min-w-0 space-y-3">
          <div ref={timeBoardRef}>
          <Card className="co-time-main-board overflow-hidden">
            <div className="co-time-board-header border-b border-slate-200 bg-white p-4">
              <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <h2 className="text-base font-black uppercase tracking-[0.04em] text-slate-950">{boardTitle}</h2>
                  <p className="mt-1 text-sm font-bold leading-5 text-slate-600">{boardDescription}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone="slate">{formatMinutes(boardSummary.totalMinutes || 0)} worked</Badge>
                  <Badge tone="slate">{formatMinutes(boardSummary.breakMinutes || 0)} breaks</Badge>
                </div>
              </div>
            </div>
            <TimeSummaryMetricsPolished summary={boardSummary} activeCount={clockedInCount} label={isOwnOnly ? "My week" : "Visible week"} />
            {boardRows.length === 0 ? (
              <div className="p-5">
                <StateCard title="No time entries yet" description={permissions.time.canManageOwn ? "Use the clock-in rail to start the first entry for this workspace." : "Visible time entries will appear here once crews start tracking work."} tone="slate" />
              </div>
            ) : (
              <TimeEntriesTablePolished rows={boardRows} selectedId={selectedTimeEntryId} onSelect={onSelectTimeEntry} maxRows={visibleRowCap} showUser={showUserColumn} />
            )}
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3">
              <p className="text-sm font-bold text-slate-600">Showing {Math.min(boardRows.length, visibleRowCap)} of {boardRows.length} visible entries</p>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{permissions.time.canCorrect ? "Corrections enabled" : "Read-only time view"}</p>
            </div>
          </Card>
          </div>

          <details className="co-time-tools-drawer">
            <summary>
              <span>
                <strong>Weekly Time Details</strong>
                <em>Daily breakdowns, category totals, and recent personal entries stay available without stretching the board.</em>
              </span>
              <span>Open details</span>
            </summary>
            <div className="co-time-tools-panel mt-3 grid gap-3 lg:grid-cols-2">
              <WeekSummaryCard summary={workspace.weeklySummary} title="My Week" description="Your current-week hours, breaks, and work breakdown." compactMobile />
              {!isOwnOnly ? <WeekSummaryCard summary={boardSummary} title={canViewAll ? "All Visible Time This Week" : "Crew This Week"} description="Role-scoped weekly totals across the entries you are allowed to view." compactMobile /> : null}
              <RecentTimeEntriesCard
                entries={workspace.ownEntries.slice(0, 5)}
                title="My recent entries"
                description="Your own clock-ins and break history."
                emptyDescription="Use the clock-in rail to create your first time entry."
                compact
                compactMobile
              />
            </div>
          </details>
        </div>

        <TimeCommandRailPolished
          user={user}
          entry={selectedTimeEntry}
          rows={boardRows}
          workspace={workspace}
          jobCostingReadiness={jobCostingReadiness}
          permissions={permissions}
          timeEditDraft={timeEditDraft}
          setTimeEditDraft={setTimeEditDraft}
          onSaveTimeEntry={onSaveTimeEntry}
          onReviewTimePresence={onReviewTimePresence}
          onClockIn={onClockIn}
          onClockOut={onClockOut}
          onStartBreak={onStartBreak}
          onEndBreak={onEndBreak}
          busy={busy}
          showClockCard={false}
          locationPolicy={timeLocationPolicy}
        />
      </div>
    </div>
  );
}

export function TimePageLegacy({
  user,
  permissions,
  rows,
  jobs,
  companySettings,
  selectedTimeEntryId,
  onSelectTimeEntry,
  selectedTimeEntry,
  timeEditDraft,
  setTimeEditDraft,
  onSaveTimeEntry,
  onReviewTimePresence,
  onClockIn,
  onClockOut,
  onStartBreak,
  onEndBreak,
  busy,
}) {
  const timeLocationPolicy = normalizeTimeLocationEvidencePolicy(companySettings?.timeLocationEvidencePolicy);
  const workspace = useMemo(() => deriveTimeWorkspace(rows, jobs, user?.id, permissions.time.allowedCategories || []), [jobs, permissions.time.allowedCategories, rows, user?.id]);
  const activeEntry = workspace.activeEntry;
  const crewWeeklySummary = useMemo(() => deriveCrewWeeklySummary(rows, { excludeUserId: user?.id }), [rows, user?.id]);
  const timeKpis = [
    { label: "Visible Entries", value: rows.length, helper: "Role-scoped time log", icon: "clock" },
    { label: "Clocked In", value: rows.filter((entry) => entry.status === "active").length, helper: "Active right now", icon: "users" },
    { label: "Needs Review", value: rows.filter((entry) => ["needs_correction", "pending_review"].includes(entry.status)).length, helper: "Corrections or approvals", icon: "alert" },
    { label: "My Week", value: formatMinutes(workspace.weeklySummary.totalMinutes || 0), helper: "Your visible hours", icon: "clipboard" },
  ];

  if (permissions.time.canViewAll) {
    const ownRecentEntries = workspace.ownEntries.slice(0, 5);

    return (
      <div>
        <PageHeader eyebrow="Time" title="Time Entries" description="Review all field time entries and correct timestamps when needed." actions={<Badge tone="blue">{rows.length} entries</Badge>} />
        <ModuleKpiStrip items={timeKpis} />
        <div className="grid min-w-0 gap-4 px-5 sm:px-6 lg:px-8">
          {permissions.time.canManageOwn ? (
            <div className="min-w-0 space-y-4">
              <ActiveTimeCard
                activeEntry={activeEntry}
                availableJobs={workspace.availableJobs}
                allowedCategories={workspace.allowedCategories}
                onClockIn={onClockIn}
                onClockOut={onClockOut}
                onStartBreak={onStartBreak}
                onEndBreak={onEndBreak}
                disabled={busy}
                description="Clock your own office or field work while keeping payroll data out of this workspace."
                compactMobile
                locationPolicy={timeLocationPolicy}
              />
              <WeekSummaryCard summary={workspace.weeklySummary} title="My Week" description="Your current-week hours only." compactMobile />
              <RecentTimeEntriesCard
                entries={ownRecentEntries}
                title="My recent entries"
                description="Your own clock-ins stay first on mobile before company-wide time management."
                emptyDescription="Use the clock-in card above to create your first time entry."
                compact
                compactMobile
              />
            </div>
          ) : null}
          <div className="grid min-w-0 gap-3.5 md:gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="min-w-0 space-y-4">
              <WeekSummaryCard summary={deriveCrewWeeklySummary(rows)} title="All Visible Time This Week" description="Role-scoped weekly totals across the time entries you are allowed to view." compactMobile />
              <Card className="min-w-0 overflow-hidden border-blue-100/80 bg-slate-50/35">
                <div className="border-b border-blue-100/80 p-3 md:p-4"><SectionHeader title="Admin time management" description="All-company review and correction tools stay below your personal clock cards on mobile." /></div>
                <div className="p-3 pt-0 md:p-4 md:pt-0"><SectionHeader title="All time entries" description="Office-admin view across every active and completed entry." /></div>
                {rows.length === 0 ? <div className="p-4"><StateCard title="No time entries yet" description="Field clock-ins will appear here once crews start using the time tools." tone="slate" /></div> : <div className="min-w-0 overflow-x-auto"><TimeEntriesTable rows={rows} selectedId={selectedTimeEntryId} onSelect={onSelectTimeEntry} /></div>}
              </Card>
            </div>
            <TimeCorrectionPanel entry={selectedTimeEntry} draft={timeEditDraft} setDraft={setTimeEditDraft} onSave={onSaveTimeEntry} onReviewPresence={onReviewTimePresence} disabled={busy} canCorrect={permissions.time.canCorrect} compactMobile />
          </div>
        </div>
      </div>
    );
  }

  if (permissions.time.canViewCrew) {
    return (
      <div>
        <PageHeader eyebrow="Field Time" title="Crew Time" description="Assigned crew time only, without payroll, rates, or office-only business data." actions={<Badge tone="blue">{rows.length} entries</Badge>} />
        <ModuleKpiStrip items={timeKpis} />
        <div className="grid gap-4 px-5 sm:px-6 lg:px-8">
          <ActiveTimeCard
            activeEntry={activeEntry}
            availableJobs={workspace.availableJobs}
            allowedCategories={workspace.allowedCategories}
            onClockIn={onClockIn}
            onClockOut={onClockOut}
            onStartBreak={onStartBreak}
            onEndBreak={onEndBreak}
            disabled={busy}
            description="Clock your own assigned or field-visible work, plus approved non-job categories."
            compactMobile
            locationPolicy={timeLocationPolicy}
          />
          <WeekSummaryCard summary={workspace.weeklySummary} title="My Week" description="Your personal weekly hours and categories." compactMobile />
          <WeekSummaryCard summary={crewWeeklySummary} title="Crew This Week" description={`Assigned-job crew totals${crewWeeklySummary.activeUserCount ? ` Â· ${crewWeeklySummary.activeUserCount} active` : ""}.`} compactMobile />
          {rows.length === 0 ? (
            <StateCard title="No crew time yet" description="Crew time will appear here once assigned field users clock into your jobs." tone="slate" />
          ) : (
            <>
              <TimeMobileAccordionCard title="Crew entries" summary={`${rows.length} visible entries`} badge={<Badge tone="slate">{rows.length}</Badge>}>
                <div className="space-y-2.5">
                  {rows.map((entry) => <TimeEntryCard key={entry.id} entry={entry} showUser compactMobile />)}
                </div>
              </TimeMobileAccordionCard>
              <div className="hidden gap-3 md:grid lg:grid-cols-2">
                {rows.map((entry) => <TimeEntryCard key={entry.id} entry={entry} showUser />)}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader eyebrow="My Time" title="My Time" description="Track only your assigned work. Contact office if your job assignment looks wrong." actions={activeEntry ? <TimeStatusBadge status={activeEntry.status} /> : <Badge tone="slate">Ready to clock in</Badge>} />
      <ModuleKpiStrip items={timeKpis} />
      <div className="grid min-w-0 gap-4 px-5 sm:px-6 lg:grid-cols-[380px_1fr] lg:px-8">
        <ActiveTimeCard
          activeEntry={activeEntry}
          availableJobs={workspace.availableJobs}
          allowedCategories={workspace.allowedCategories}
          onClockIn={onClockIn}
          onClockOut={onClockOut}
          onStartBreak={onStartBreak}
          onEndBreak={onEndBreak}
          disabled={busy}
          compactMobile
          locationPolicy={timeLocationPolicy}
        />
        <div className="min-w-0 space-y-4">
          <WeekSummaryCard summary={workspace.weeklySummary} description="Your current-week hours, breaks, and work breakdown." compactMobile />
          <RecentTimeEntriesCard entries={workspace.sortedEntries} description="Only your own time entries are visible here." emptyDescription="Clock in on an allowed job or work category to start your first time entry." compact compactMobile />
        </div>
      </div>
    </div>
  );
}
