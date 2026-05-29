import { useEffect, useState } from "react";

import { ApexOfficeCommandShell, Badge, Button, Card, Icon, InputField, SectionHeader, SelectField, StateCard, TextAreaField } from "./app-shell-components";
import { jobTitle } from "./job-utils";
import { workCategoryLabel } from "./time-category-utils";
import { formatMinutes, timeLocationEvidencePayload, timeLocationStatusLabel, timeStatusTone } from "./time-utils";
import { normalizeTimeLocationEvidencePolicy } from "../shared/permissions";

export { workCategoryLabel } from "./time-category-utils";

export function TimeStatusBadge({ status }) {
  return <Badge tone={timeStatusTone(status)}>{status === "on_break" ? "On Break" : status === "completed" ? "Completed" : "Active"}</Badge>;
}

function timeEntryDateTimeLabel(value) {
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

export function TimeKpiCardPolished({ item }) {
  const tone = item.tone || "orange";
  const rawValue = Number(item.rawValue ?? item.value ?? 0);
  const isEmpty = Number.isFinite(rawValue) ? rawValue <= 0 : false;

  return (
    <div className="co-command-kpi border p-3" data-tone={tone}>
      <div className="co-command-kpi-body">
        <div className="co-command-kpi-icon">
          <Icon name={item.icon} className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className={`co-command-kpi-value ${isEmpty ? "is-empty" : ""}`}>{item.value ?? 0}</p>
          <p className="mt-0.5 break-words text-sm font-black leading-tight text-slate-950">{item.label}</p>
          <p className="mt-0.5 break-words text-xs font-bold leading-[1.35] text-slate-700">{item.helper}</p>
        </div>
      </div>
      {item.actionLabel ? (
        <button type="button" onClick={item.onAction} className="co-command-kpi-link co-focus-ring">
          {item.actionLabel}
          <span aria-hidden="true">-&gt;</span>
        </button>
      ) : null}
    </div>
  );
}

export function TimeSummaryMetricsPolished({ summary, activeCount = 0, label = "This week" }) {
  const safeSummary = summary || { totalMinutes: 0, breakMinutes: 0, groupedBreakdown: [] };

  return (
    <div className="co-time-summary-strip">
      <div>
        <span>{label}</span>
        <strong>{formatMinutes(safeSummary.totalMinutes)}</strong>
        <small>worked</small>
      </div>
      <div>
        <span>Breaks</span>
        <strong>{formatMinutes(safeSummary.breakMinutes)}</strong>
        <small>recorded</small>
      </div>
      <div>
        <span>Categories</span>
        <strong>{safeSummary.groupedBreakdown?.length || 0}</strong>
        <small>visible</small>
      </div>
      <div>
        <span>Clocked in</span>
        <strong>{activeCount}</strong>
        <small>right now</small>
      </div>
    </div>
  );
}

export function TimeMobileAccordionCard({ title, summary, badge, defaultOpen = false, children }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="co-mobile-accordion panel-sheen rounded-3xl border border-blue-100 bg-white/95 shadow-panel md:hidden">
      <button type="button" className="flex w-full cursor-pointer items-start justify-between gap-3 p-3.5 text-left" aria-expanded={isOpen} onClick={() => setIsOpen((current) => !current)}>
        <span className="min-w-0">
          <span className="block text-base font-black text-slate-950">{title}</span>
          {summary ? <span className="mt-1 block break-words text-xs font-bold leading-5 text-slate-500">{summary}</span> : null}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {badge}
          <span className={`co-mobile-toggle-pill rounded-full px-2.5 py-1 text-xs font-black ${isOpen ? "is-active bg-blue-700 text-white" : "bg-blue-50 text-blue-700"}`}>{isOpen ? "Hide ^" : "Show v"}</span>
        </span>
      </button>
      {isOpen ? <div className="border-t border-blue-100 p-3.5">
        {children}
      </div> : null}
    </div>
  );
}

export function TimeMobileFieldGroup({ title, summary, defaultOpen = false, children }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="co-mobile-field-group rounded-2xl border border-blue-100 bg-white">
      <button type="button" className="flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2.5 text-left" aria-expanded={isOpen} onClick={() => setIsOpen((current) => !current)}>
        <span className="min-w-0">
          <span className="block text-sm font-black text-slate-950">{title}</span>
          {summary ? <span className="mt-0.5 block text-xs font-bold text-slate-500">{summary}</span> : null}
        </span>
        <span className="co-mobile-toggle-pill shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-black text-blue-700">{isOpen ? "Hide ^" : "Show v"}</span>
      </button>
      {isOpen ? <div className="grid gap-3 border-t border-blue-100 p-3">
        {children}
      </div> : null}
    </div>
  );
}

export function RecentTimeEntriesCard({ entries, title = "Recent entries", description, emptyTitle = "No time entries yet", emptyDescription = "Clock in to start your first time entry.", showUser = false, compact = false, compactMobile = false }) {
  const safeEntries = Array.isArray(entries) ? entries : [];
  const content = safeEntries.length === 0 ? (
    <StateCard title={emptyTitle} description={emptyDescription} tone="slate" />
  ) : (
    <div className={compactMobile ? "space-y-2.5 md:space-y-3" : "space-y-3"}>
      {safeEntries.map((entry) => <TimeEntryCard key={entry.id} entry={entry} showUser={showUser} compact={compact} compactMobile={compactMobile} />)}
    </div>
  );

  if (compactMobile) {
    return (
      <>
        <TimeMobileAccordionCard title={title} summary={`${safeEntries.length} visible entries`} badge={<Badge tone="slate">{safeEntries.length}</Badge>}>
          {content}
        </TimeMobileAccordionCard>
        <Card className="hidden p-5 md:block">
          <SectionHeader title={title} description={description} />
          {content}
        </Card>
      </>
    );
  }

  return (
    <Card className={compactMobile ? "p-3.5 md:p-5" : "p-5"}>
      <SectionHeader title={title} description={description} />
      {content}
    </Card>
  );
}

export function TimeEntryCard({ entry, showUser = false, compact = false, compactMobile = false }) {
  const presenceReview = entry.jobsitePresenceReview || {};
  const showPresenceReview = shouldShowPresenceReview(presenceReview);

  return (
    <div className={compactMobile ? "co-mobile-record-card rounded-2xl border border-blue-100 bg-white p-3 md:p-4" : "rounded-2xl border border-blue-100 bg-white p-4"}>
      <div className={compactMobile ? "flex flex-wrap items-start justify-between gap-2.5" : "flex flex-wrap items-start justify-between gap-3"}>
        <div className="min-w-0">
          <p className={compactMobile ? "break-words text-[13px] font-black text-slate-950 md:text-sm" : "break-words text-sm font-black text-slate-950"}>{entry.jobTitle || workCategoryLabel(entry.workCategory)}</p>
          <p className="mt-1 break-words text-xs font-bold text-slate-500">{entry.workCategory === "job" ? (entry.address || "Jobsite details pending") : workCategoryLabel(entry.workCategory)}</p>
          {showUser ? <p className="mt-1 break-words text-xs font-bold text-slate-500">{entry.userName}</p> : null}
        </div>
        <TimeStatusBadge status={entry.status} />
      </div>
      <div className={`${compactMobile ? "mt-2.5 gap-2.5 md:mt-3 md:gap-3" : "mt-3 gap-3"} grid ${compact ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Clock in</p>
          <p className={compactMobile ? "mt-1 text-[13px] font-bold text-slate-700 md:text-sm" : "mt-1 text-sm font-bold text-slate-700"}>{timeEntryDateTimeLabel(entry.clockInAt)}</p>
        </div>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Clock out</p>
          <p className={compactMobile ? "mt-1 text-[13px] font-bold text-slate-700 md:text-sm" : "mt-1 text-sm font-bold text-slate-700"}>{entry.clockOutAt ? timeEntryDateTimeLabel(entry.clockOutAt) : "Still active"}</p>
        </div>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Total</p>
          <p className={compactMobile ? "mt-1 text-[13px] font-bold text-slate-700 md:text-sm" : "mt-1 text-sm font-bold text-slate-700"}>{entry.status === "completed" ? formatMinutes(entry.totalMinutes) : "In progress"}</p>
        </div>
      </div>
      <div className={compactMobile ? "mt-2.5 flex flex-wrap gap-1.5 md:mt-3 md:gap-2" : "mt-3 flex flex-wrap gap-2"}>
        <Badge tone="slate">{workCategoryLabel(entry.workCategory)}</Badge>
        <Badge tone="slate">Break {formatMinutes(entry.breakMinutes)}</Badge>
        <Badge tone={timeLocationTone(timeLocationStatusLabel(entry, "clockIn"))}>In GPS {timeLocationStatusLabel(entry, "clockIn")}</Badge>
        <Badge tone={timeLocationTone(timeLocationStatusLabel(entry, "clockOut"))}>Out GPS {timeLocationStatusLabel(entry, "clockOut")}</Badge>
        {showPresenceReview ? <Badge tone={presenceReview.tone || "slate"}>{presenceReview.label}</Badge> : null}
        {entry.scheduledStart ? <Badge tone="blue">{timeEntryDateTimeLabel(entry.scheduledStart)}</Badge> : null}
      </div>
      {showPresenceReview && presenceReview.detail ? (
        <p className={compactMobile ? "mt-2.5 text-[13px] font-bold leading-5 text-slate-600 md:mt-3 md:text-sm md:leading-6" : "mt-3 text-sm font-bold leading-6 text-slate-600"}>{presenceReview.detail}</p>
      ) : null}
      {entry.notes ? <p className={compactMobile ? "mt-2.5 text-[13px] leading-5 text-slate-600 md:mt-3 md:text-sm md:leading-6" : "mt-3 text-sm leading-6 text-slate-600"}>{entry.notes}</p> : null}
    </div>
  );
}

const EMPTY_TIME_LOCATION_EVIDENCE = {
  latitude: null,
  longitude: null,
  locationAccuracy: null,
  locationCapturedAt: "",
  locationUnavailableReason: "",
};

function timeLocationTone(label) {
  if (label === "Location captured") return "green";
  if (label === "Not requested") return "slate";
  return "amber";
}

function shouldShowPresenceReview(review = {}) {
  return Boolean(review?.status && !["off", "not_applicable"].includes(review.status));
}

export function TimeLocationCaptureControl({ evidence, onChange, disabled, action = "clock action", locationPolicy }) {
  const policy = normalizeTimeLocationEvidencePolicy(locationPolicy);
  const policyEnabled = policy.enabled === true;
  const statusLabel = timeLocationStatusLabel(evidence);

  function handleRequestLocation() {
    if (!policyEnabled) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      onChange({
        ...EMPTY_TIME_LOCATION_EVIDENCE,
        locationUnavailableReason: "Location services are unavailable in this browser.",
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChange({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          locationAccuracy: position.coords.accuracy,
          locationCapturedAt: new Date(position.timestamp).toISOString(),
          locationUnavailableReason: "",
        });
      },
      (error) => {
        const reason = error.code === error.PERMISSION_DENIED
          ? "Location permission denied by user."
          : error.code === error.TIMEOUT
            ? "Location request timed out."
            : "Location unavailable on this device.";
        onChange({
          ...EMPTY_TIME_LOCATION_EVIDENCE,
          locationUnavailableReason: reason,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  }

  return (
    <div className={policyEnabled ? "rounded-2xl border border-blue-100 bg-blue-50/45 p-3" : "rounded-2xl border border-slate-200 bg-slate-50 p-3"}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Optional location evidence</p>
          <p className="mt-1 text-sm font-bold leading-5 text-slate-600">
            {policyEnabled ? policy.workerNotice : "Location capture is off for this company. Time tracking still works without GPS evidence."}
          </p>
        </div>
        <Badge tone={policyEnabled ? timeLocationTone(statusLabel) : "slate"}>{policyEnabled ? statusLabel : "Policy off"}</Badge>
      </div>
      {evidence.latitude != null && evidence.longitude != null ? (
        <p className="mt-2 text-xs font-bold text-slate-600">{Number(evidence.latitude).toFixed(5)}, {Number(evidence.longitude).toFixed(5)} / accuracy {Math.round(Number(evidence.locationAccuracy || 0))} m</p>
      ) : evidence.locationUnavailableReason ? (
        <p className="mt-2 text-xs font-bold text-slate-600">{evidence.locationUnavailableReason}</p>
      ) : null}
      <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={handleRequestLocation} disabled={disabled || !policyEnabled}>
        Capture location
      </Button>
    </div>
  );
}

export function ActiveTimeCard({ activeEntry, availableJobs, allowedCategories, onClockIn, onClockOut, onStartBreak, onEndBreak, disabled, description = "Start time on one of your allowed work categories.", compactMobile = false, mobileDefaultOpen = true, heroClock = false, locationPolicy }) {
  const safeAllowedCategories = Array.isArray(allowedCategories) ? allowedCategories : [];
  const safeAvailableJobs = Array.isArray(availableJobs) ? availableJobs : [];
  const defaultCategory = safeAllowedCategories[0] || "job";
  const [workCategory, setWorkCategory] = useState(defaultCategory);
  const [jobId, setJobId] = useState(safeAvailableJobs[0]?.id || "");
  const [notes, setNotes] = useState("");
  const [clockInLocation, setClockInLocation] = useState(EMPTY_TIME_LOCATION_EVIDENCE);
  const [clockOutLocation, setClockOutLocation] = useState(EMPTY_TIME_LOCATION_EVIDENCE);
  const selectedJob = safeAvailableJobs.find((job) => job.id === jobId);
  const selectedWorkSummary = workCategory === "job" ? (selectedJob ? jobTitle(selectedJob) : "Select an assigned job") : workCategoryLabel(workCategory);
  const selectedWorkSubline = workCategory === "job"
    ? (selectedJob?.address || selectedJob?.customer || "Assigned job")
    : "Non-job work category";
  const canSubmitClockIn = safeAllowedCategories.length > 0 && !(workCategory === "job" && !jobId);

  useEffect(() => {
    if (activeEntry) return;
    if (workCategory !== "job") return;
    if (safeAvailableJobs.some((job) => job.id === jobId)) return;
    setJobId(safeAvailableJobs[0]?.id || "");
  }, [activeEntry, jobId, safeAvailableJobs, workCategory]);

  useEffect(() => {
    if (safeAllowedCategories.includes(workCategory)) return;
    setWorkCategory(defaultCategory);
  }, [defaultCategory, safeAllowedCategories, workCategory]);

  const handleClockInSubmit = (event) => {
    event.preventDefault();
    if (!canSubmitClockIn) return;
    onClockIn({
      workCategory,
      jobId: workCategory === "job" ? jobId : "",
      notes,
      ...timeLocationEvidencePayload("clockIn", clockInLocation),
    });
    setNotes("");
    setClockInLocation(EMPTY_TIME_LOCATION_EVIDENCE);
  };

  function handleClockOutSubmit() {
    if (!activeEntry?.id) return;
    onClockOut(activeEntry.id, timeLocationEvidencePayload("clockOut", clockOutLocation));
  }

  const clockInFields = (
    <>
      <SelectField label="Work category" value={workCategory} onChange={(event) => setWorkCategory(event.target.value)}>
        {safeAllowedCategories.map((category) => <option key={category} value={category}>{workCategoryLabel(category)}</option>)}
      </SelectField>
      {workCategory === "job" ? (
        safeAvailableJobs.length === 0 ? (
          <StateCard title="No job options yet" description="Contact office if the right assigned job is missing." tone="slate" />
        ) : (
          <SelectField label="Job" value={jobId} onChange={(event) => setJobId(event.target.value)}>
            {safeAvailableJobs.map((job) => <option key={job.id} value={job.id}>{jobTitle(job)}</option>)}
          </SelectField>
        )
      ) : null}
      <TextAreaField label="Clock-in note" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional note for the office or foreman." />
      <TimeLocationCaptureControl evidence={clockInLocation} onChange={setClockInLocation} disabled={disabled} action="clock-in" locationPolicy={locationPolicy} />
    </>
  );

  if (activeEntry) {
    const activeStartedLabel = activeEntry.clockInAt ? timeEntryDateTimeLabel(activeEntry.clockInAt) : "Time entry active";
    const activeTotalLabel = activeEntry.status === "completed" ? formatMinutes(activeEntry.totalMinutes) : "In progress";
    const activeActions = (
      <div className={compactMobile ? "co-time-active-actions mt-3 flex flex-wrap gap-2 md:mt-4" : "co-time-active-actions mt-4 flex flex-wrap gap-2"}>
        {activeEntry.status === "active" ? <Button className="co-time-clock-secondary flex-1" size="lg" onClick={() => onStartBreak(activeEntry.id)} disabled={disabled}>Start break</Button> : null}
        {activeEntry.status === "on_break" ? <Button className="co-time-clock-secondary flex-1" size="lg" onClick={() => onEndBreak(activeEntry.id)} disabled={disabled}>End break</Button> : null}
        <Button className="co-time-clock-secondary flex-1" size="lg" variant="secondary" onClick={handleClockOutSubmit} disabled={disabled}>Clock out</Button>
      </div>
    );

    if (compactMobile) {
      return (
        <>
          <TimeMobileAccordionCard title="Active clock" summary={activeEntry.status === "on_break" ? "You are currently on break." : "You are clocked in."} badge={<TimeStatusBadge status={activeEntry.status} />} defaultOpen={mobileDefaultOpen}>
            <div className="co-time-active-target rounded-2xl border p-3">
              <p className="break-words text-sm font-black text-slate-950">{activeEntry.jobTitle || workCategoryLabel(activeEntry.workCategory)}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">Started {activeStartedLabel}</p>
            </div>
            <div className="mt-3">
              <TimeLocationCaptureControl evidence={clockOutLocation} onChange={setClockOutLocation} disabled={disabled} action="clock-out" locationPolicy={locationPolicy} />
            </div>
            {activeActions}
            <div className="mt-3">
              <TimeMobileFieldGroup title="Time details" summary={activeEntry.clockInAt ? `Started ${timeEntryDateTimeLabel(activeEntry.clockInAt)}` : "Entry details"}>
                <TimeEntryCard entry={activeEntry} compact compactMobile />
              </TimeMobileFieldGroup>
            </div>
          </TimeMobileAccordionCard>
          <Card className={heroClock ? "co-time-active-card hidden p-5 md:block" : "hidden p-5 md:block"}>
            <SectionHeader title="Active clock" description="Keep your current time entry accurate before heading back to the job." action={<TimeStatusBadge status={activeEntry.status} />} />
            {heroClock ? (
              <div className="co-time-active-hero-grid">
                <div className="co-time-active-now-card">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Clocked into</p>
                  <h3>{activeEntry.jobTitle || workCategoryLabel(activeEntry.workCategory)}</h3>
                  <p>{activeEntry.address || activeEntry.notes || workCategoryLabel(activeEntry.workCategory)}</p>
                  <div className="co-time-active-metric-grid">
                    <span><strong>{activeStartedLabel}</strong><em>Clock in</em></span>
                    <span><strong>{activeEntry.clockOutAt ? timeEntryDateTimeLabel(activeEntry.clockOutAt) : "Still active"}</strong><em>Clock out</em></span>
                    <span><strong>{formatMinutes(activeEntry.breakMinutes)}</strong><em>Break</em></span>
                    <span><strong>{activeTotalLabel}</strong><em>Total</em></span>
                  </div>
                </div>
                <div className="co-time-active-control-card">
                  <p>{activeEntry.status === "on_break" ? "Break is running" : "Time is running"}</p>
                  <strong>{activeEntry.status === "on_break" ? "End break before returning to work." : "Start a break or clock out when the shift is done."}</strong>
                  <TimeLocationCaptureControl evidence={clockOutLocation} onChange={setClockOutLocation} disabled={disabled} action="clock-out" locationPolicy={locationPolicy} />
                  {activeActions}
                </div>
              </div>
            ) : (
              <>
                <TimeEntryCard entry={activeEntry} compact compactMobile={compactMobile} />
                <div className="mt-3">
                  <TimeLocationCaptureControl evidence={clockOutLocation} onChange={setClockOutLocation} disabled={disabled} action="clock-out" locationPolicy={locationPolicy} />
                </div>
                {activeActions}
              </>
            )}
            <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
              {activeEntry.status === "on_break" ? "You are currently on break." : "You are already clocked in."}
            </p>
          </Card>
        </>
      );
    }

    return (
      <Card className={compactMobile ? "p-3.5 md:p-5" : "p-5"}>
        <SectionHeader title="Active clock" description="Keep your current time entry accurate before heading back to the job." />
        <TimeEntryCard entry={activeEntry} compact compactMobile={compactMobile} />
        <div className="mt-3">
          <TimeLocationCaptureControl evidence={clockOutLocation} onChange={setClockOutLocation} disabled={disabled} action="clock-out" locationPolicy={locationPolicy} />
        </div>
        {activeActions}
        <p className={compactMobile ? "mt-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 md:mt-3 md:text-xs" : "mt-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-400"}>
          {activeEntry.status === "on_break" ? "You are currently on break." : "You are already clocked in."}
        </p>
      </Card>
    );
  }

  if (compactMobile) {
    return (
      <>
        <TimeMobileAccordionCard title="Clock In" summary="Ready to clock in" badge={<Badge tone="slate">Ready</Badge>} defaultOpen={mobileDefaultOpen}>
          {safeAllowedCategories.length === 0 ? (
            <StateCard title="Clock-in not available" description="This role is not set up for self time tracking right now." tone="slate" />
          ) : (
            <form className="grid gap-3" onSubmit={handleClockInSubmit}>
              <div className="co-time-clock-target rounded-2xl border p-3">
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Clocking into</p>
                <p className="mt-1 break-words text-sm font-black text-slate-950">{selectedWorkSummary}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">{selectedWorkSubline}</p>
              </div>
              <Button type="submit" size="lg" className="co-time-clock-primary co-time-clock-cta w-full" disabled={disabled || !canSubmitClockIn}>
                <Icon name="clock" />
                Clock in now
              </Button>
              <div className="co-time-clock-fields">
                <TimeMobileFieldGroup title="Change job/category or add note" summary={selectedWorkSummary}>
                  {clockInFields}
                </TimeMobileFieldGroup>
              </div>
            </form>
          )}
        </TimeMobileAccordionCard>
        <Card className="hidden p-5 md:block">
          <SectionHeader title="Clock in" description={description} />
          {safeAllowedCategories.length === 0 ? (
            <StateCard title="Clock-in not available" description="This role is not set up for self time tracking right now." tone="slate" />
          ) : (
            <form className="co-time-clock-form" onSubmit={handleClockInSubmit}>
              <div className="co-time-clock-target rounded-2xl border p-3">
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Clocking into</p>
                <p className="mt-1 break-words text-sm font-black text-slate-950">{selectedWorkSummary}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">{selectedWorkSubline}</p>
              </div>
              <div className="co-time-clock-fields">
                {clockInFields}
              </div>
              <Button type="submit" size="lg" className="co-time-clock-primary co-time-clock-cta w-full" disabled={disabled || !canSubmitClockIn}>
                <Icon name="clock" />
                Clock in now
              </Button>
            </form>
          )}
        </Card>
      </>
    );
  }

  return (
      <Card className={compactMobile ? "p-3.5 md:p-5" : "p-5"}>
        <SectionHeader title="Clock in" description={description} />
      {safeAllowedCategories.length === 0 ? (
        <StateCard title="Clock-in not available" description="This role is not set up for self time tracking right now." tone="slate" />
      ) : (
        <form
          className={compactMobile ? "co-time-clock-form grid gap-2.5 md:gap-3" : "co-time-clock-form"}
          onSubmit={handleClockInSubmit}
        >
          <div className="co-time-clock-target rounded-2xl border p-3">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Clocking into</p>
            <p className="mt-1 break-words text-sm font-black text-slate-950">{selectedWorkSummary}</p>
            <p className="mt-1 text-xs font-bold text-slate-500">{selectedWorkSubline}</p>
          </div>
          <div className="co-time-clock-fields">
            {clockInFields}
          </div>
          <Button type="submit" size="lg" className="co-time-clock-primary co-time-clock-cta w-full" disabled={disabled || !canSubmitClockIn}>
            <Icon name="clock" />
            Clock in now
          </Button>
        </form>
      )}
    </Card>
  );
}

export function TimeEntriesTable({ rows, selectedId, onSelect }) {
  return (
    <table className="w-full min-w-[860px] text-left">
      <thead className="border-b border-blue-100 bg-slate-50 text-[11px] font-black uppercase tracking-widest text-slate-500">
        <tr>
          <th className="px-4 py-3">User</th>
          <th className="px-4 py-3">Work</th>
          <th className="px-4 py-3">Clock in</th>
          <th className="px-4 py-3">Clock out</th>
          <th className="px-4 py-3">Break</th>
          <th className="px-4 py-3">Total</th>
          <th className="px-4 py-3">Status</th>
          <th className="px-4 py-3">Presence</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-blue-50">
        {rows.map((entry) => {
          const selected = entry.id === selectedId;
          return (
            <tr key={entry.id} onClick={() => onSelect(entry.id)} className={`cursor-pointer transition hover:bg-blue-50/60 ${selected ? "bg-blue-50/80" : ""}`}>
              <td className="px-4 py-3">
                <p className="font-black text-slate-950">{entry.userName}</p>
                <p className="text-xs font-bold text-slate-500">{entry.userRole || "Field user"}</p>
              </td>
              <td className="px-4 py-3">
                <p className="text-sm font-bold text-slate-700">{entry.jobTitle || workCategoryLabel(entry.workCategory)}</p>
                <p className="text-xs font-bold text-slate-500">{workCategoryLabel(entry.workCategory)}</p>
              </td>
              <td className="px-4 py-3 text-sm font-bold text-slate-700">{timeEntryDateTimeLabel(entry.clockInAt)}</td>
              <td className="px-4 py-3 text-sm font-bold text-slate-700">{entry.clockOutAt ? timeEntryDateTimeLabel(entry.clockOutAt) : "Still active"}</td>
              <td className="px-4 py-3 text-sm font-bold text-slate-700">{formatMinutes(entry.breakMinutes)}</td>
              <td className="px-4 py-3 text-sm font-bold text-slate-700">{entry.status === "completed" ? formatMinutes(entry.totalMinutes) : "In progress"}</td>
              <td className="px-4 py-3"><TimeStatusBadge status={entry.status} /></td>
              <td className="px-4 py-3">{shouldShowPresenceReview(entry.jobsitePresenceReview) ? <Badge tone={entry.jobsitePresenceReview.tone || "slate"}>{entry.jobsitePresenceReview.label}</Badge> : <Badge tone="slate">No review</Badge>}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function TimeEntriesTablePolished({ rows, selectedId, onSelect, maxRows = 8, showUser = true }) {
  const visibleRows = maxRows ? rows.slice(0, maxRows) : rows;

  return (
    <>
      <div className="co-time-mobile-list-surface md:hidden">
        <div className="co-field-mobile-section-head">
          <span>
            <strong>Visible entries</strong>
            <em>{visibleRows.length} of {rows.length} entries shown</em>
          </span>
          <b>{rows.length}</b>
        </div>
        <div className="co-time-mobile-list grid gap-3 p-3">
          {visibleRows.map((entry) => {
            const selected = entry.id === selectedId;
            const totalLabel = entry.status === "completed" ? formatMinutes(entry.totalMinutes) : "In progress";

            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => onSelect(entry.id)}
                className={`co-time-mobile-card co-mobile-record-card co-office-list-card w-full rounded-[1.15rem] border p-4 text-left transition ${selected ? "is-selected border-orange-200 bg-orange-50/70" : "border-slate-200 bg-white hover:border-orange-200 hover:bg-orange-50/30"}`}
              >
                <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-lg font-black text-slate-950">{entry.jobTitle || workCategoryLabel(entry.workCategory)}</p>
                    <p className="mt-1 break-words text-xs font-bold text-slate-500">{showUser ? `${entry.userName} / ${entry.userRole || "Field user"}` : workCategoryLabel(entry.workCategory)}</p>
                  </div>
                  <div className="shrink-0">
                    <TimeStatusBadge status={entry.status} />
                  </div>
                </div>
                <div className="co-time-mobile-metrics">
                  <span>Clock in <strong>{timeEntryDateTimeLabel(entry.clockInAt)}</strong></span>
                  <span>Clock out <strong>{entry.clockOutAt ? timeEntryDateTimeLabel(entry.clockOutAt) : "Active"}</strong></span>
                  <span>Total <strong>{totalLabel}</strong></span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone="slate">{workCategoryLabel(entry.workCategory)}</Badge>
                  <Badge tone="slate">Break {formatMinutes(entry.breakMinutes)}</Badge>
                  {shouldShowPresenceReview(entry.jobsitePresenceReview) ? <Badge tone={entry.jobsitePresenceReview.tone || "slate"}>{entry.jobsitePresenceReview.label}</Badge> : null}
                  {selected ? <Badge tone="blue">Selected</Badge> : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <div className="table-shell hidden min-w-0 overflow-x-auto md:block">
        <table className={`co-time-command-table ${showUser ? "" : "is-own-view"} w-full min-w-[820px] text-left`}>
          <thead>
            <tr>
              {showUser ? <th>User</th> : null}
              <th>Work</th>
              <th>Clock in</th>
              <th>Clock out</th>
              <th>Break</th>
              <th>Total</th>
              <th>Status</th>
              <th>Presence</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((entry) => {
              const selected = entry.id === selectedId;
              const totalLabel = entry.status === "completed" ? formatMinutes(entry.totalMinutes) : "In progress";

              return (
                <tr key={entry.id} onClick={() => onSelect(entry.id)} className={`cursor-pointer transition hover:bg-orange-50/45 ${selected ? "bg-orange-50/70" : ""}`}>
                  {showUser ? (
                    <td>
                      <p className="font-black text-slate-950">{entry.userName}</p>
                      <p className="text-xs font-bold text-slate-500">{entry.userRole || "Field user"}</p>
                    </td>
                  ) : null}
                  <td>
                    <p className="font-black text-slate-950">{entry.jobTitle || workCategoryLabel(entry.workCategory)}</p>
                    <p className="text-xs font-bold text-slate-500">{workCategoryLabel(entry.workCategory)}</p>
                  </td>
                  <td className="font-bold text-slate-700">{timeEntryDateTimeLabel(entry.clockInAt)}</td>
                  <td className="font-bold text-slate-700">{entry.clockOutAt ? timeEntryDateTimeLabel(entry.clockOutAt) : "Still active"}</td>
                  <td className="font-bold text-slate-700">{formatMinutes(entry.breakMinutes)}</td>
                  <td className="font-bold text-slate-700">{totalLabel}</td>
                  <td><TimeStatusBadge status={entry.status} /></td>
                  <td>{shouldShowPresenceReview(entry.jobsitePresenceReview) ? <Badge tone={entry.jobsitePresenceReview.tone || "slate"}>{entry.jobsitePresenceReview.label}</Badge> : <Badge tone="slate">No review</Badge>}</td>
                  <td>
                    <div className="flex justify-end gap-1">
                      <button type="button" className="co-time-icon-button" onClick={(event) => { event.stopPropagation(); onSelect(entry.id); }} aria-label={`Review time entry ${entry.id}`}>
                        <Icon name="clock" />
                      </button>
                      <button type="button" className="co-time-icon-button" onClick={(event) => { event.stopPropagation(); onSelect(entry.id); }} aria-label={`Open time entry ${entry.id}`}>
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

export function TimeCorrectionPanel({ entry, draft, setDraft, onSave, disabled, canCorrect, compactMobile = false }) {
  if (!entry) {
    return (
      <Card className="p-5">
        <SectionHeader title="Time details" description="Select a time entry to review or correct it." />
        <StateCard title="No time entry selected" description="Choose an entry from the table to inspect its timestamps and notes." tone="slate" />
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <SectionHeader title={entry.userName} description={`${entry.jobTitle || entry.jobId} / ${entry.id}`} action={<TimeStatusBadge status={entry.status} />} />
      <div className={compactMobile ? "grid gap-2.5 md:gap-3" : "grid gap-3"}>
        <div className={compactMobile ? "flex flex-wrap gap-1.5 md:gap-2" : "flex flex-wrap gap-2"}>
          <Badge tone="slate">{entry.id}</Badge>
          <Badge tone="slate">{workCategoryLabel(entry.workCategory)}</Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <SelectField label="Work category" value={draft.workCategory} onChange={(event) => setDraft((current) => ({ ...current, workCategory: event.target.value }))} disabled={!canCorrect || disabled}>
            {["job", "office_admin", "estimating", "lead_follow_up", "shop_yard", "travel", "training", "meeting", "maintenance", "other"].map((category) => (
              <option key={category} value={category}>{workCategoryLabel(category)}</option>
            ))}
          </SelectField>
          <InputField label="Job ID" value={draft.jobId} onChange={(event) => setDraft((current) => ({ ...current, jobId: event.target.value }))} disabled={!canCorrect || disabled} />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <InputField label="Clock in" type="datetime-local" value={draft.clockInAt} onChange={(event) => setDraft((current) => ({ ...current, clockInAt: event.target.value }))} disabled={!canCorrect || disabled} />
          <InputField label="Clock out" type="datetime-local" value={draft.clockOutAt} onChange={(event) => setDraft((current) => ({ ...current, clockOutAt: event.target.value }))} disabled={!canCorrect || disabled} />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <InputField label="Break start" type="datetime-local" value={draft.breakStartAt} onChange={(event) => setDraft((current) => ({ ...current, breakStartAt: event.target.value }))} disabled={!canCorrect || disabled} />
          <InputField label="Break end" type="datetime-local" value={draft.breakEndAt} onChange={(event) => setDraft((current) => ({ ...current, breakEndAt: event.target.value }))} disabled={!canCorrect || disabled} />
        </div>
        <TextAreaField label="Notes" value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} disabled={!canCorrect || disabled} />
        <div className="flex flex-wrap gap-2">
          <Badge tone="slate">Break {formatMinutes(entry.breakMinutes)}</Badge>
          <Badge tone="slate">Total {entry.status === "completed" ? formatMinutes(entry.totalMinutes) : "In progress"}</Badge>
        </div>
        {canCorrect ? <Button size={compactMobile ? "sm" : "md"} onClick={onSave} disabled={disabled}>Save correction</Button> : <StateCard title="Read-only" description="Only office leadership can correct time entries." tone="slate" />}
      </div>
    </Card>
  );
}

export function TimeJobCostingReadinessCard({ readiness }) {
  if (!readiness) return null;

  return (
    <Card className="co-time-rail-card p-4">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-700">Job costing + proof</p>
          <h3 className="mt-2 text-base font-black leading-tight text-slate-950">{readiness.status}</h3>
          <p className="mt-1 text-xs font-bold leading-5 text-slate-600">{readiness.nextAction} before time moves into billing review.</p>
        </div>
        <Badge tone={readiness.tone}>{readiness.proofReadyJobs} ready</Badge>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-slate-200 bg-white p-2">
          <span className="block text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Jobs</span>
          <strong className="mt-1 block text-sm font-black text-slate-950">{readiness.linkedJobs}</strong>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-2">
          <span className="block text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Gaps</span>
          <strong className="mt-1 block text-sm font-black text-slate-950">{readiness.jobsWithGaps}</strong>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-2">
          <span className="block text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Unlinked</span>
          <strong className="mt-1 block text-sm font-black text-slate-950">{readiness.unlinkedEntries}</strong>
        </div>
      </div>
      <div className="mt-3 grid gap-2">
        {readiness.topJobs.length ? readiness.topJobs.map((job) => (
          <div key={job.jobId} className="rounded-xl border border-slate-200 bg-white p-2.5">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <p className="min-w-0 truncate text-xs font-black text-slate-900">{job.label}</p>
              <Badge tone={job.tone}>{formatMinutes(job.minutes)}</Badge>
            </div>
            <p className="mt-1 text-[11px] font-bold leading-4 text-slate-500">
              {job.entries} entr{job.entries === 1 ? "y" : "ies"} / {job.proofCount} proof item{job.proofCount === 1 ? "" : "s"}
            </p>
            <p className="mt-1 text-[11px] font-bold leading-4 text-slate-600">
              {job.gaps.length ? job.gaps.slice(0, 2).join(" / ") : "Time, reviewed report, and photo proof line up."}
            </p>
          </div>
        )) : (
          <StateCard title="No job time yet" description="Clocked job time will appear here for proof and office review." tone="slate" />
        )}
      </div>
      <p className="mt-3 text-[11px] font-bold leading-5 text-slate-500">
        Review-only. No payroll rates, pricing, margin, invoices, or billing changes are exposed here.
      </p>
    </Card>
  );
}

const TIME_CLOCK_COMMAND_ID = "time-clock-command";

function timeEntryStatusLabel(status) {
  if (status === "on_break") return "On break";
  if (status === "completed") return "Completed";
  return "Active";
}

function timeEntrySelectedBadgeStatus(status) {
  if (status === "completed") return "complete";
  if (status === "on_break") return "waiting";
  return "in progress";
}

function timeEntryQueueTone(entry) {
  if (entry?.status === "on_break") return "amber";
  if (entry?.status === "completed") return "green";
  return "blue";
}

function timeEntryTotalLabel(entry) {
  if (!entry) return "";
  return entry.status === "completed" ? formatMinutes(entry.totalMinutes) : "In progress";
}

function timeEntrySortWeight(entry) {
  if (entry?.status === "on_break") return 0;
  if (entry?.status && entry.status !== "completed") return 1;
  return 2;
}

function buildTimeShellQueueItems({ rows, workspace, permissions, showUser }) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const activeEntry = workspace?.activeEntry || null;
  const queueItems = [];

  if (permissions?.time?.canManageOwn) {
    queueItems.push({
      id: TIME_CLOCK_COMMAND_ID,
      kind: "clock",
      eyebrow: activeEntry ? "My active clock" : "My clock",
      title: activeEntry ? (activeEntry.jobTitle || workCategoryLabel(activeEntry.workCategory)) : "Clock into assigned work",
      meta: activeEntry
        ? (activeEntry.address || activeEntry.notes || workCategoryLabel(activeEntry.workCategory))
        : "Start clean job-linked time without leaving the board.",
      status: activeEntry ? timeEntryStatusLabel(activeEntry.status) : "Ready",
      statusLabel: activeEntry ? timeEntrySelectedBadgeStatus(activeEntry.status) : "ready",
      tone: activeEntry ? timeEntryQueueTone(activeEntry) : "orange",
      actionLabel: activeEntry ? "Manage clock" : "Clock in",
      badges: [
        { label: activeEntry ? workCategoryLabel(activeEntry.workCategory) : "Job-linked", tone: "slate" },
        { label: activeEntry ? timeEntryTotalLabel(activeEntry) : "Ready", tone: activeEntry ? timeEntryQueueTone(activeEntry) : "orange" },
      ],
      entry: activeEntry,
    });
  }

  safeRows
    .filter((entry) => entry?.id && entry.id !== activeEntry?.id)
    .slice()
    .sort((a, b) => timeEntrySortWeight(a) - timeEntrySortWeight(b))
    .forEach((entry) => {
      const title = entry.jobTitle || workCategoryLabel(entry.workCategory);
      queueItems.push({
        id: entry.id,
        kind: "entry",
        eyebrow: showUser ? (entry.userName || "Field user") : workCategoryLabel(entry.workCategory),
        title,
        meta: showUser
          ? `${entry.userRole || "Field user"} / ${workCategoryLabel(entry.workCategory)}`
          : (entry.address || entry.notes || workCategoryLabel(entry.workCategory)),
        status: timeEntryStatusLabel(entry.status),
        statusLabel: timeEntrySelectedBadgeStatus(entry.status),
        tone: timeEntryQueueTone(entry),
        actionLabel: permissions?.time?.canCorrect ? "Review" : "Open",
        badges: [
          { label: timeEntryTotalLabel(entry), tone: timeEntryQueueTone(entry) },
          { label: `Break ${formatMinutes(entry.breakMinutes)}`, tone: "slate" },
          ...(showUser && entry.userName ? [{ label: entry.userName, tone: "blue" }] : []),
        ],
        entry,
      });
    });

  return queueItems;
}

function TimeShellFact({ label, value }) {
  return (
    <span>
      <em>{label}</em>
      <strong>{value}</strong>
    </span>
  );
}

function TimeShellClockSummary({
  workspace,
  permissions,
  onClockIn,
  onClockOut,
  onStartBreak,
  onEndBreak,
  busy,
  locationPolicy,
}) {
  if (!permissions?.time?.canManageOwn) {
    return (
      <Card className="co-time-shell-card p-4">
        <SectionHeader title="My clock" description="This role can review time but cannot start or stop a personal clock here." />
        <StateCard title="Read-only clock" description="Clock controls stay limited by role." tone="slate" />
      </Card>
    );
  }

  return (
    <div className="co-time-shell-clock">
      <ActiveTimeCard
        activeEntry={workspace.activeEntry}
        availableJobs={workspace.availableJobs}
        allowedCategories={workspace.allowedCategories}
        onClockIn={onClockIn}
        onClockOut={onClockOut}
        onStartBreak={onStartBreak}
        onEndBreak={onEndBreak}
        disabled={busy}
        description="Start or stop job-linked time from the same office command surface."
        locationPolicy={locationPolicy}
      />
    </div>
  );
}

function TimeShellSelectedEntry({
  entry,
  showUser,
  permissions,
  timeEditDraft,
  setTimeEditDraft,
  onSaveTimeEntry,
  busy,
}) {
  if (!entry) {
    return (
      <StateCard
        title="No time entry selected"
        description="Choose a visible entry or open your clock command to review status, breaks, and correction access."
        tone="slate"
      />
    );
  }

  return (
    <div className="co-time-shell-entry-stack">
      <Card className="co-time-shell-selected-card p-4">
        <div className="co-time-shell-selected-head">
          <div className="min-w-0">
            <p>{showUser ? entry.userName || "Field user" : workCategoryLabel(entry.workCategory)}</p>
            <h2>{entry.jobTitle || workCategoryLabel(entry.workCategory)}</h2>
            <span>{entry.address || entry.notes || entry.id}</span>
          </div>
          <TimeStatusBadge status={entry.status} />
        </div>
        <div className="co-time-shell-facts">
          <TimeShellFact label="Clock in" value={timeEntryDateTimeLabel(entry.clockInAt)} />
          <TimeShellFact label="Clock out" value={entry.clockOutAt ? timeEntryDateTimeLabel(entry.clockOutAt) : "Still active"} />
          <TimeShellFact label="Break" value={formatMinutes(entry.breakMinutes)} />
          <TimeShellFact label="Total" value={timeEntryTotalLabel(entry)} />
        </div>
        <div className="co-time-shell-badges">
          <Badge tone="slate">{entry.id}</Badge>
          <Badge tone="slate">{workCategoryLabel(entry.workCategory)}</Badge>
          {showUser && entry.userRole ? <Badge tone="blue">{entry.userRole}</Badge> : null}
        </div>
        {entry.notes ? <p className="co-time-shell-note">{entry.notes}</p> : null}
      </Card>

      {permissions?.time?.canCorrect ? (
        <details className="co-time-shell-correction-drawer">
          <summary>
            <span>
              <strong>Correction tools</strong>
              <em>Edit work category, timestamps, breaks, or notes when leadership approval is needed.</em>
            </span>
            <b>Open</b>
          </summary>
          <div className="co-time-shell-correction-body">
            <TimeCorrectionPanel
              entry={entry}
              draft={timeEditDraft}
              setDraft={setTimeEditDraft}
              onSave={onSaveTimeEntry}
              disabled={busy}
              canCorrect={permissions.time.canCorrect}
              compactMobile
            />
          </div>
        </details>
      ) : (
        <Card className="co-time-shell-card p-4">
          <SectionHeader title="Correction access" description="Only office leadership can change submitted time entries." />
          <StateCard title="Read-only time view" description="No payroll rates, pricing, or margin data are shown here." tone="slate" />
        </Card>
      )}
    </div>
  );
}

export function TimeDesktopCommandShell({
  eyebrow,
  title,
  description,
  kpis,
  rows,
  boardSummary,
  workspace,
  jobCostingReadiness,
  permissions,
  selectedEntry,
  selectedEntryId,
  onSelectEntry,
  timeEditDraft,
  setTimeEditDraft,
  onSaveTimeEntry,
  onClockIn,
  onClockOut,
  onStartBreak,
  onEndBreak,
  busy,
  showUser,
  canOpenTimeSupport,
  onOpenTimeSupport,
  locationPolicy,
}) {
  const queueItems = buildTimeShellQueueItems({ rows, workspace, permissions, showUser });
  const initialSelection = workspace?.activeEntry && permissions?.time?.canManageOwn
    ? TIME_CLOCK_COMMAND_ID
    : selectedEntryId || queueItems[0]?.id || "";
  const [selectedShellItemId, setSelectedShellItemId] = useState(initialSelection);
  const selectedQueueItem = queueItems.find((item) => item.id === selectedShellItemId)
    || queueItems.find((item) => item.id === selectedEntryId)
    || queueItems[0]
    || null;
  const selectedDetailEntry = selectedQueueItem?.kind === "clock"
    ? selectedQueueItem.entry
    : selectedQueueItem?.entry || selectedEntry || null;
  const activeCount = Array.isArray(rows) ? rows.filter((entry) => entry.status !== "completed").length : 0;
  const onBreakCount = Array.isArray(rows) ? rows.filter((entry) => entry.status === "on_break").length : 0;
  const proofGapCount = Number(jobCostingReadiness?.jobsWithGaps || 0);

  useEffect(() => {
    if (!selectedEntryId) return;
    if (selectedShellItemId === TIME_CLOCK_COMMAND_ID) return;
    if (selectedShellItemId === selectedEntryId) return;
    if (queueItems.some((item) => item.id === selectedEntryId)) {
      setSelectedShellItemId(selectedEntryId);
    }
  }, [queueItems, selectedEntryId, selectedShellItemId]);

  const quickActions = [
    permissions?.time?.canManageOwn ? {
      id: "clock",
      label: workspace?.activeEntry ? "Manage Clock" : "Clock In",
      icon: "clock",
      onClick: () => setSelectedShellItemId(TIME_CLOCK_COMMAND_ID),
    } : null,
    onBreakCount ? {
      id: "breaks",
      label: "Review Breaks",
      icon: "alert",
      onClick: () => {
        const breakEntry = queueItems.find((item) => item.entry?.status === "on_break");
        if (breakEntry) {
          setSelectedShellItemId(breakEntry.id);
          onSelectEntry?.(breakEntry.entry.id);
        }
      },
    } : null,
    canOpenTimeSupport ? {
      id: "support",
      label: "Time Support",
      icon: "help",
      onClick: onOpenTimeSupport,
    } : null,
  ].filter(Boolean);

  return (
    <ApexOfficeCommandShell
      className="co-time-shell-command"
      eyebrow={eyebrow}
      title={title}
      description={description}
      kpis={kpis}
      quickActions={quickActions}
      queue={{
        title: "Time priority queue",
        description: "Clock status, active breaks, and the latest visible entries.",
        items: queueItems,
        selectedId: selectedQueueItem?.id || "",
        limit: 6,
        badgeLabel: `${Math.min(queueItems.length, 6)}/${queueItems.length}`,
        onSelect: (item) => {
          setSelectedShellItemId(item.id);
          if (item.kind === "entry" && item.entry?.id) {
            onSelectEntry?.(item.entry.id);
          }
        },
        emptyState: <StateCard title="No time work yet" description="Clock commands and visible entries appear here once time is available." tone="slate" />,
      }}
      detail={{
        title: selectedQueueItem?.kind === "clock" ? "Clock command" : "Selected time entry",
        item: selectedQueueItem,
        emptyState: <StateCard title="Nothing selected" description="Choose a time item to review the field-safe details." tone="slate" />,
        render: (item) => (
          <div className="co-time-shell-detail-scroll">
            {item?.kind === "clock" ? (
              <TimeShellClockSummary
                workspace={workspace}
                permissions={permissions}
                onClockIn={onClockIn}
                onClockOut={onClockOut}
                onStartBreak={onStartBreak}
                onEndBreak={onEndBreak}
                busy={busy}
                locationPolicy={locationPolicy}
              />
            ) : (
              <TimeShellSelectedEntry
                entry={selectedDetailEntry}
                showUser={showUser}
                permissions={permissions}
                timeEditDraft={timeEditDraft}
                setTimeEditDraft={setTimeEditDraft}
                onSaveTimeEntry={onSaveTimeEntry}
                busy={busy}
              />
            )}

            <Card className="co-time-shell-card p-4">
              <SectionHeader title="Visible week" description="Role-scoped totals with payroll, pricing, and margin removed." />
              <div className="co-time-shell-facts">
                <TimeShellFact label="Worked" value={formatMinutes(boardSummary.totalMinutes || 0)} />
                <TimeShellFact label="Breaks" value={formatMinutes(boardSummary.breakMinutes || 0)} />
                <TimeShellFact label="Active" value={activeCount} />
                <TimeShellFact label="Proof gaps" value={proofGapCount} />
              </div>
            </Card>

            {permissions?.time?.canViewAll ? <TimeJobCostingReadinessCard readiness={jobCostingReadiness} /> : null}

            <Card className="co-time-shell-card p-4">
              <SectionHeader title="Access guardrails" description="Time stays field-safe inside the desktop command shell." />
              <div className="co-time-guardrail-list">
                <span><Icon name="check" />No payroll rates shown</span>
                <span><Icon name="check" />No pricing or margin data</span>
                <span><Icon name="check" />Corrections limited by role</span>
              </div>
            </Card>
          </div>
        ),
      }}
    />
  );
}

export function TimeCommandRailPolished({
  user,
  entry,
  rows,
  workspace,
  jobCostingReadiness,
  permissions,
  timeEditDraft,
  setTimeEditDraft,
  onSaveTimeEntry,
  onClockIn,
  onClockOut,
  onStartBreak,
  onEndBreak,
  busy,
  showClockCard = true,
  locationPolicy,
}) {
  const clockedInCount = rows.filter((item) => item.status !== "completed").length;
  const completedCount = rows.filter((item) => item.status === "completed").length;
  const totalLabel = entry ? (entry.status === "completed" ? formatMinutes(entry.totalMinutes) : "In progress") : `${rows.length} visible`;

  return (
    <div className="co-time-right-rail space-y-4">
      {permissions.time.canManageOwn && showClockCard ? (
        <ActiveTimeCard
          activeEntry={workspace.activeEntry}
          availableJobs={workspace.availableJobs}
          allowedCategories={workspace.allowedCategories}
          onClockIn={onClockIn}
          onClockOut={onClockOut}
          onStartBreak={onStartBreak}
          onEndBreak={onEndBreak}
          disabled={busy}
          description="Clock your own office or field work while keeping payroll data out of this workspace."
          compactMobile
          locationPolicy={locationPolicy}
        />
      ) : null}

      <Card className="co-time-rail-card p-4">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">{entry ? "Selected time summary" : "Time console"}</p>
            <h3 className="mt-2 break-words text-xl font-black leading-tight text-slate-950">{entry ? entry.userName : user?.name || "Workspace time"}</h3>
            <p className="mt-1 break-words text-xs font-black text-slate-500">{entry ? `${entry.id} / ${entry.userRole || "Field user"}` : "Role-scoped time review"}</p>
          </div>
          {entry ? <TimeStatusBadge status={entry.status} /> : <Badge tone={clockedInCount ? "blue" : "slate"}>{clockedInCount} active</Badge>}
        </div>

        <div className="co-time-selected-metrics">
          <div>
            <span>{entry ? "Work" : "Entries"}</span>
            <strong>{entry ? (entry.jobTitle || workCategoryLabel(entry.workCategory)) : rows.length}</strong>
          </div>
          <div>
            <span>{entry ? "Clock in" : "Completed"}</span>
            <strong>{entry ? timeEntryDateTimeLabel(entry.clockInAt) : completedCount}</strong>
          </div>
          <div>
            <span>{entry ? "Break" : "My week"}</span>
            <strong>{entry ? formatMinutes(entry.breakMinutes) : formatMinutes(workspace.weeklySummary.totalMinutes || 0)}</strong>
          </div>
          <div>
            <span>{entry ? "Total" : "Status"}</span>
            <strong>{totalLabel}</strong>
          </div>
        </div>

        {entry?.notes ? <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold leading-6 text-slate-600">{entry.notes}</p> : null}
      </Card>

      {permissions.time.canCorrect && entry ? (
        <TimeCorrectionPanel entry={entry} draft={timeEditDraft} setDraft={setTimeEditDraft} onSave={onSaveTimeEntry} disabled={busy} canCorrect={permissions.time.canCorrect} compactMobile />
      ) : null}

      {permissions.time.canViewAll ? <TimeJobCostingReadinessCard readiness={jobCostingReadiness} /> : null}

      <Card className="co-time-rail-card p-4">
        <SectionHeader title="Access Guardrails" description="Time stays role-scoped and field-safe." />
        <div className="co-time-guardrail-list">
          <span><Icon name="check" />No payroll rates shown</span>
          <span><Icon name="check" />No pricing or margin data</span>
          <span><Icon name="check" />Corrections limited by role</span>
        </div>
      </Card>
    </div>
  );
}

export function WeekSummaryCard({ summary, title = "This Week", description, compactMobile = false }) {
  const cardClassName = compactMobile ? "p-3.5 md:p-5" : "p-5";
  const metricCardClassName = compactMobile ? "rounded-2xl border border-blue-100 bg-blue-50/50 p-3 md:p-4" : "rounded-2xl border border-blue-100 bg-blue-50/50 p-4";
  const metricValueClassName = compactMobile ? "mt-1 text-lg font-black text-slate-950 md:mt-2 md:text-xl" : "mt-2 text-xl font-black text-slate-950";
  const sectionCardClassName = compactMobile ? "rounded-2xl border border-blue-100 p-3 md:p-4" : "rounded-2xl border border-blue-100 p-4";
  const outerGridClassName = compactMobile ? "grid gap-2.5 sm:grid-cols-3" : "grid gap-3 sm:grid-cols-3";
  const lowerGridClassName = compactMobile ? "mt-3 grid gap-3 lg:grid-cols-2" : "mt-4 grid gap-4 lg:grid-cols-2";
  const summaryText = `Worked ${formatMinutes(summary.totalMinutes)} / Breaks ${formatMinutes(summary.breakMinutes)} / ${summary.groupedBreakdown.length} categories`;
  const content = (
    <>
      <div className={outerGridClassName}>
        <div className={metricCardClassName}>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Worked</p>
          <p className={metricValueClassName}>{formatMinutes(summary.totalMinutes)}</p>
        </div>
        <div className={metricCardClassName}>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Breaks</p>
          <p className={metricValueClassName}>{formatMinutes(summary.breakMinutes)}</p>
        </div>
        <div className={metricCardClassName}>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Categories</p>
          <p className={metricValueClassName}>{summary.groupedBreakdown.length}</p>
        </div>
      </div>
      <div className={lowerGridClassName}>
        <div className={sectionCardClassName}>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Daily breakdown</p>
          <div className="mt-3 space-y-2">
            {summary.dayBreakdown.map((day) => (
              <div key={day.label} className="flex items-center justify-between text-sm">
                <span className="font-bold text-slate-600">{day.label}</span>
                <span className="font-black text-slate-950">{day.minutes ? formatMinutes(day.minutes) : "No time yet"}</span>
              </div>
            ))}
          </div>
        </div>
        <div className={sectionCardClassName}>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Job / category breakdown</p>
          {summary.groupedBreakdown.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No time logged this week yet.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {summary.groupedBreakdown.map((group) => (
                <div key={group.label} className="flex items-center justify-between text-sm">
                  <span className="font-bold text-slate-600">{group.label}</span>
                  <span className="font-black text-slate-950">{formatMinutes(group.minutes)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );

  if (compactMobile) {
    return (
      <>
        <TimeMobileAccordionCard title={title} summary={summaryText} badge={summary.activeEntry ? <TimeStatusBadge status={summary.activeEntry.status} /> : null}>
          {content}
        </TimeMobileAccordionCard>
        <Card className="hidden p-5 md:block">
          <SectionHeader title={title} description={description} action={summary.activeEntry ? <TimeStatusBadge status={summary.activeEntry.status} /> : null} />
          {content}
        </Card>
      </>
    );
  }

  return (
    <Card className={cardClassName}>
      <SectionHeader title={title} description={description} action={summary.activeEntry ? <TimeStatusBadge status={summary.activeEntry.status} /> : null} />
      {content}
    </Card>
  );
}
