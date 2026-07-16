import { fieldChecklistNeedsAction, fieldChecklistSummary } from "./field-format-utils.js";
import { jobTitle } from "./job-utils.js";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function text(value = "") {
  return String(value ?? "").trim();
}

function dateKey(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function sameJob(record, jobId) {
  return Boolean(jobId && record?.jobId === jobId);
}

function isOpenSafetyIncident(incident = {}) {
  const status = text(incident.status || incident.state).toLowerCase();
  return !/(closed|resolved|reviewed|archived)/.test(status);
}

function isSubmittedDailyReport(report = {}) {
  return /^(submitted|reviewed)$/i.test(text(report.status || "draft"));
}

function isOpenChangeRequest(request = {}) {
  const status = text(request.status || "requested").toLowerCase();
  return !request.archivedAt && !/(rejected|archived)/.test(status);
}

function timeEntryMatchesJob(entry = {}, jobId = "") {
  if (!entry || !jobId) return false;
  return text(entry.jobId || entry.linkedJobId || entry.job?.id) === jobId;
}

function buildItem({ id, label, status, helper, moduleId, actionLabel, ready = false, enabled = true, tone = "", phase = "" }) {
  return {
    id,
    label,
    status,
    helper,
    moduleId,
    actionLabel,
    ready: Boolean(ready),
    enabled: Boolean(enabled),
    tone: tone || (ready ? "green" : "amber"),
    phase: phase || "execution",
  };
}

export function deriveFieldModeFinishState(source = {}, options = {}) {
  const role = source.role === "foreman" ? "foreman" : "employee";
  const isForeman = role === "foreman";
  const permissions = source.permissions || {};
  const workspace = source.workspace || {};
  const primaryJob = source.focusJob || workspace.nextAssignedJob || asArray(workspace.assignedJobs)[0] || null;
  const jobId = primaryJob?.id || "";
  const today = options.today || dateKey(new Date());
  const timeWorkspace = source.timeWorkspace || {};
  const activeEntry = timeWorkspace.activeEntry || null;
  const jobReports = asArray(source.dailyReports).filter((report) => sameJob(report, jobId));
  const todayReports = jobReports.filter((report) => dateKey(report.reportDate || report.createdAt || report.updatedAt) === today);
  const submittedTodayReports = todayReports.filter(isSubmittedDailyReport);
  const jobUploads = asArray(source.uploads).filter((upload) => sameJob(upload, jobId));
  const todayUploads = jobUploads.filter((upload) => dateKey(upload.takenAt || upload.uploadedAt || upload.createdAt) === today);
  const jobTickets = asArray(source.deliveryTickets).filter((ticket) => sameJob(ticket, jobId));
  const todayTickets = jobTickets.filter((ticket) => dateKey(ticket.deliveredAt || ticket.ticketDate || ticket.createdAt) === today);
  const jobSafetyIncidents = asArray(source.safetyIncidents).filter((incident) => sameJob(incident, jobId) && isOpenSafetyIncident(incident));
  const jobToolChecklists = asArray(source.toolChecklists).filter((checklist) => sameJob(checklist, jobId));
  const openToolChecklists = jobToolChecklists.filter(fieldChecklistNeedsAction);
  const jobChangeRequests = asArray(source.changeOrderRequests).filter((request) => sameJob(request, jobId));
  const openChangeRequests = jobChangeRequests.filter(isOpenChangeRequest);
  const notices = asArray(workspace.assignmentNotices);
  const prePourPending = permissions?.prePour?.canView && fieldChecklistNeedsAction(primaryJob?.prePourChecklist);
  const postPourPending = permissions?.postPour?.canView && fieldChecklistNeedsAction(primaryJob?.postPourChecklist);
  const toolChecklistReady = permissions?.toolChecklist?.canUse && jobToolChecklists.length > 0;
  const hasActiveJobClock = timeEntryMatchesJob(activeEntry, jobId);
  const reportReadyForHandoff = !isForeman || submittedTodayReports.length > 0;
  const proofReadyForHandoff = todayUploads.length > 0 || jobUploads.length > 0;
  const checklistsReadyForHandoff = !prePourPending && !postPourPending && openToolChecklists.length === 0;
  const checklistHandoffModule = prePourPending ? "prePour" : postPourPending ? "postPour" : "toolChecklist";
  const safetyReadyForHandoff = jobSafetyIncidents.length === 0;
  const endOfDayReady = Boolean(primaryJob && !activeEntry && proofReadyForHandoff && reportReadyForHandoff && checklistsReadyForHandoff && safetyReadyForHandoff);
  const hasPwaInstallPath = source.pwaInstallReady !== false;
  const pwaInstallHelper = hasPwaInstallPath
    ? "Install from the browser menu for faster field access. Live records still need connection."
    : "PWA install metadata is not ready in this workspace.";

  const items = [
    buildItem({
      id: "today_job",
      label: "Today's job",
      status: primaryJob ? "Ready" : "Needs assignment",
      helper: primaryJob ? `${jobTitle(primaryJob)} is selected for field-safe work.` : "No assigned job is ready on this phone.",
      moduleId: "jobs",
      actionLabel: primaryJob ? "Open job" : "Check jobs",
      ready: Boolean(primaryJob),
      tone: primaryJob ? "green" : "amber",
      phase: "assignment",
    }),
    buildItem({
      id: "arrival_start",
      label: "Arrival / start",
      status: !primaryJob ? "Needs assignment" : notices.length ? "Notice first" : hasActiveJobClock ? "Started" : "Ready to start",
      helper: !primaryJob
        ? "Open assigned jobs or contact office if work is missing."
        : notices.length
          ? "Acknowledge the assignment before starting field work."
          : hasActiveJobClock
            ? "Clock is running for the selected job."
            : "Confirm address, then start job time when work begins.",
      moduleId: notices.length ? "jobs" : "time",
      actionLabel: notices.length ? "Review notice" : hasActiveJobClock ? "Open time" : "Start time",
      ready: Boolean(primaryJob && !notices.length && hasActiveJobClock),
      enabled: Boolean(permissions?.time?.canView || primaryJob),
      tone: primaryJob && !notices.length && hasActiveJobClock ? "green" : "orange",
      phase: "arrival",
    }),
    buildItem({
      id: "clock_time",
      label: "Clock / time",
      status: activeEntry ? (activeEntry.status === "on_break" ? "On break" : "Clock running") : "Ready to clock",
      helper: activeEntry ? (activeEntry.jobTitle || "Time is active.") : "Clock controls are field-safe for your own time.",
      moduleId: "time",
      actionLabel: activeEntry ? "Open time" : "Clock in",
      ready: Boolean(activeEntry),
      enabled: Boolean(permissions?.time?.canView),
      tone: activeEntry ? "green" : "orange",
      phase: "execution",
    }),
    notices.length ? buildItem({
      id: "assignment_notice",
      label: "Assignment notice",
      status: `${notices.length} to acknowledge`,
      helper: "Confirm schedule, address, and field notes before work starts.",
      moduleId: "jobs",
      actionLabel: "Review notice",
      ready: false,
      tone: "amber",
      phase: "arrival",
    }) : null,
    permissions?.uploads?.canView ? buildItem({
      id: "photos_proof",
      label: "Photos / proof",
      status: todayUploads.length ? `${todayUploads.length} today` : jobUploads.length ? `${jobUploads.length} on job` : "Needs proof",
      helper: todayUploads.length ? "Photo proof has been captured today." : "Capture job-linked photos before closeout.",
      moduleId: "uploads",
      actionLabel: "Upload photos",
      ready: todayUploads.length > 0 || jobUploads.length > 0,
      tone: todayUploads.length || jobUploads.length ? "green" : "amber",
      phase: "proof",
    }) : null,
    isForeman && permissions?.reports?.canView ? buildItem({
      id: "daily_report",
      label: "Daily report",
      status: submittedTodayReports.length ? "Submitted today" : todayReports.length ? "Draft today" : "Needs report",
      helper: submittedTodayReports.length ? "Daily report is ready for office review." : todayReports.length ? "Finish and submit the daily report before handoff." : "Open reports for labor, weather, progress, and blockers.",
      moduleId: "reports",
      actionLabel: "Open report",
      ready: submittedTodayReports.length > 0,
      tone: submittedTodayReports.length ? "green" : "amber",
      phase: "report",
    }) : null,
    permissions?.deliveryTickets?.canView ? buildItem({
      id: "delivery_tickets",
      label: "Delivery tickets",
      status: todayTickets.length ? `${todayTickets.length} today` : jobTickets.length ? `${jobTickets.length} on job` : "Optional",
      helper: todayTickets.length || jobTickets.length ? "Ticket proof is linked for field review." : "Add tickets when deliveries arrive.",
      moduleId: "deliveryTickets",
      actionLabel: "Open tickets",
      ready: todayTickets.length > 0 || jobTickets.length > 0,
      tone: todayTickets.length || jobTickets.length ? "green" : "slate",
      phase: "proof",
    }) : null,
    prePourPending || postPourPending || permissions?.toolChecklist?.canUse ? buildItem({
      id: "checklists",
      label: "Tickets / checklists",
      status: prePourPending ? fieldChecklistSummary(primaryJob?.prePourChecklist) : postPourPending ? fieldChecklistSummary(primaryJob?.postPourChecklist) : openToolChecklists.length ? `${openToolChecklists.length} tool list open` : toolChecklistReady ? "Tool list ready" : "Ready",
      helper: prePourPending ? "Job prep still needs field action." : postPourPending ? "Closeout still needs field action." : openToolChecklists.length ? "Finish open tool checklist items before handoff." : "Use ticket, checklist, and tool workflows for clean handoff.",
      moduleId: prePourPending ? "prePour" : postPourPending ? "postPour" : "toolChecklist",
      actionLabel: "Open checklist",
      ready: !prePourPending && !postPourPending && openToolChecklists.length === 0,
      tone: prePourPending || postPourPending || openToolChecklists.length ? "amber" : "green",
      phase: "checklist",
    }) : null,
    permissions?.safety?.canView ? buildItem({
      id: "safety",
      label: "Safety / PPE",
      status: jobSafetyIncidents.length ? `${jobSafetyIncidents.length} open` : "Ready",
      helper: jobSafetyIncidents.length ? "Open field safety for visible job issues." : "PPE, toolbox, and incident tools stay field-safe.",
      moduleId: jobSafetyIncidents.length ? "incidents" : "ppe",
      actionLabel: jobSafetyIncidents.length ? "Open incidents" : "Open PPE",
      ready: jobSafetyIncidents.length === 0,
      tone: jobSafetyIncidents.length ? "amber" : "green",
      phase: "safety",
    }) : null,
    isForeman && (permissions?.changeOrders?.canRequest || permissions?.changeOrders?.canManage) ? buildItem({
      id: "change_request",
      label: "Change request",
      status: openChangeRequests.length ? `${openChangeRequests.length} in review` : "Available",
      helper: openChangeRequests.length ? "Field change request is documented for office review." : "Capture extra work from the field for office review before outside action.",
      moduleId: "changeOrders",
      actionLabel: "Open changes",
      ready: true,
      tone: "slate",
      phase: "handoff",
    }) : null,
    buildItem({
      id: "end_of_day_handoff",
      label: "End-of-day handoff",
      status: endOfDayReady ? "Ready" : "Needs wrap-up",
      helper: endOfDayReady
        ? "Proof, reports, safety, checklists, and time are clear for review."
        : activeEntry
          ? "Clock out when the field day is done."
          : !proofReadyForHandoff
            ? "Add job proof before leaving the day open."
            : !reportReadyForHandoff
              ? "Submit the daily report for review."
              : !checklistsReadyForHandoff
                ? "Finish open checklist items."
                : !safetyReadyForHandoff
                  ? "Document safety follow-up before handoff."
                  : "Review the assigned job before handoff.",
      moduleId: activeEntry ? "time" : !proofReadyForHandoff ? "uploads" : !reportReadyForHandoff ? "reports" : !checklistsReadyForHandoff ? checklistHandoffModule : !safetyReadyForHandoff ? "incidents" : "jobs",
      actionLabel: endOfDayReady ? "Review job" : "Finish item",
      ready: endOfDayReady,
      enabled: Boolean(primaryJob),
      tone: endOfDayReady ? "green" : "amber",
      phase: "handoff",
    }),
    buildItem({
      id: "pwa_install",
      label: "Install / offline",
      status: hasPwaInstallPath ? "Install-ready" : "Needs setup",
      helper: `${pwaInstallHelper} Offline drafts remain planned, not silently enabled.`,
      moduleId: "support",
      actionLabel: "Open help",
      ready: hasPwaInstallPath,
      tone: hasPwaInstallPath ? "blue" : "amber",
      phase: "access",
    }),
  ].filter(Boolean);

  const requiredItems = items.filter((item) => item.enabled && item.tone !== "slate");
  const readyRequiredItems = requiredItems.filter((item) => item.ready);
  const blockerCount = requiredItems.length - readyRequiredItems.length;
  const nextAction = items.find((item) => item.enabled && !item.ready && item.moduleId) || items.find((item) => item.moduleId) || null;

  return {
    mode: "field_mode_finish",
    role,
    canView: true,
    title: "Field Execution Finish",
    status: blockerCount ? "Needs field action" : "Field-ready",
    tone: blockerCount ? "amber" : "green",
    summary: primaryJob
      ? `${readyRequiredItems.length} of ${requiredItems.length} required field items are ready for ${jobTitle(primaryJob)}.`
      : "No assigned job is ready on this phone yet.",
    primaryJobId: jobId,
    items,
    nextAction,
    metrics: {
      totalItems: items.length,
      requiredItems: requiredItems.length,
      readyRequiredItems: readyRequiredItems.length,
      blockerCount,
      todayUploads: todayUploads.length,
      todayReports: todayReports.length,
      todayTickets: todayTickets.length,
      openSafetyIncidents: jobSafetyIncidents.length,
      openChangeRequests: openChangeRequests.length,
      endOfDayReady: endOfDayReady ? 1 : 0,
    },
    safetyBoundary: "Field Mode only shows assigned field-safe job context. Private business context, automation controls, and confidential notes stay out of the crew workspace. GPS is optional and user-tapped only.",
  };
}
