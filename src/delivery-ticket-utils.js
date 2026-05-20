export function deliveryTicketTitle(ticket) {
  if (!ticket) return "Delivery ticket";
  return ticket.ticketNumber || ticket.truckNumber || ticket.supplier || "Delivery ticket";
}

function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function ticketJobLabel(ticket = {}) {
  return ticket?.job?.title || ticket?.jobTitle || ticket?.jobId || "Job unavailable";
}

function ticketCreatorLabel(ticket = {}) {
  return ticket?.createdByName || ticket?.createdBy || "Field user";
}

function ticketDateLabel(ticket = {}) {
  return String(ticket?.arrivalTime || ticket?.deliveryDate || ticket?.ticketDate || ticket?.createdAt || "").slice(0, 10) || "No date";
}

function ticketTimeLabel(ticket = {}) {
  return ticket?.arrivalTime || ticket?.dischargeTime || ticket?.createdAt || "No time recorded";
}

function ticketSupportScopeLabel(user = {}, permissions = {}) {
  if (permissions?.deliveryTickets?.canManageAll) return "all visible company delivery tickets";
  if (permissions?.deliveryTickets?.canCreate || permissions?.deliveryTickets?.canEditOwn) return "assigned job delivery tickets";
  return `${String(user?.role || "role").trim() || "role"} visible delivery tickets`;
}

function ticketMissingBasics(ticket = {}) {
  return !ticket?.supplier || !ticket?.truckNumber || !ticket?.ticketNumber || !Number(ticket?.yardsDelivered || 0);
}

function recordJobId(record = {}) {
  return String(record?.jobId || record?.job?.id || "").trim();
}

function jobLabel(job = {}, fallback = "Job unavailable") {
  return String(job?.title || job?.label || job?.job || job?.jobTitle || job?.customer || fallback).trim() || fallback;
}

function ticketSupportPriorityItems(tickets = [], limit = 3) {
  return (Array.isArray(tickets) ? tickets : [])
    .filter((ticket) => !ticket?.archivedAt)
    .map((ticket) => {
      if (ticketMissingBasics(ticket)) {
        return { label: deliveryTicketTitle(ticket), reason: "Supplier, truck, ticket number, or yardage missing", priority: 1 };
      }
      if (!ticket?.ticketUploadId) {
        return { label: deliveryTicketTitle(ticket), reason: "Photo evidence not linked", priority: 2 };
      }
      if (!ticket?.reportId) {
        return { label: deliveryTicketTitle(ticket), reason: "Daily report not linked", priority: 3 };
      }
      return null;
    })
    .filter(Boolean)
    .sort((left, right) => left.priority - right.priority || left.label.localeCompare(right.label))
    .slice(0, limit);
}

export function filterDeliveryTickets(tickets = [], {
  job = "All jobs",
  supplier = "All suppliers",
  createdBy = "All creators",
  date = "All dates",
  archived = "Active",
  search = "",
} = {}) {
  const query = String(search || "").trim().toLowerCase();
  return (Array.isArray(tickets) ? tickets : []).filter((ticket) => {
    const isArchived = Boolean(ticket.archivedAt);
    if (archived === "Active" && isArchived) return false;
    if (archived === "Archived" && !isArchived) return false;
    if (job !== "All jobs" && String(ticket.job?.title || "") !== job) return false;
    if (supplier !== "All suppliers" && String(ticket.supplier || "") !== supplier) return false;
    if (createdBy !== "All creators" && String(ticket.createdByName || "") !== createdBy) return false;
    if (date !== "All dates" && String(ticket.createdAt || "").slice(0, 10) !== date) return false;
    if (!query) return true;

    const haystack = [
      ticket.ticketNumber,
      ticket.truckNumber,
      ticket.supplier,
      ticket.mixNotes,
      ticket.notes,
      ticket.job?.title,
      ticket.job?.customer,
      ticket.createdByName,
    ].filter(Boolean).join(" ").toLowerCase();

    return haystack.includes(query);
  });
}

export function deriveDeliveryTicketListState(tickets = [], jobs = []) {
  const safeTickets = Array.isArray(tickets) ? tickets : [];
  const safeJobs = Array.isArray(jobs) ? jobs : [];
  return {
    jobOptions: ["All jobs", ...new Set([
      ...safeTickets.map((ticket) => ticket.job?.title).filter(Boolean),
      ...safeJobs.map((job) => job.title).filter(Boolean),
    ])],
    supplierOptions: ["All suppliers", ...new Set(safeTickets.map((ticket) => ticket.supplier).filter(Boolean))],
    creatorOptions: ["All creators", ...new Set(safeTickets.map((ticket) => ticket.createdByName).filter(Boolean))],
    dateOptions: ["All dates", ...new Set(safeTickets.map((ticket) => String(ticket.createdAt || "").slice(0, 10)).filter(Boolean))],
    defaultJobId: safeJobs.length === 1 ? safeJobs[0].id : "",
  };
}

export function deriveDeliveryTicketCloseoutReadiness(tickets = [], jobs = [], { maxJobs = 4 } = {}) {
  const safeTickets = Array.isArray(tickets) ? tickets : [];
  const safeJobs = Array.isArray(jobs) ? jobs : [];
  const jobMap = new Map(safeJobs.map((job) => [String(job?.id || "").trim(), job]));
  const jobSummaries = new Map();
  let activeTickets = 0;
  let unlinkedTickets = 0;
  let missingBasics = 0;
  let missingPhotos = 0;
  let missingReports = 0;
  let readyTickets = 0;
  let yardsLogged = 0;

  safeTickets.forEach((ticket) => {
    if (ticket?.archivedAt) return;
    activeTickets += 1;
    const basicsMissing = ticketMissingBasics(ticket);
    const photoMissing = !ticket?.ticketUploadId;
    const reportMissing = !ticket?.reportId;
    const yards = Number(ticket?.yardsDelivered || 0);
    yardsLogged += yards;
    if (basicsMissing) missingBasics += 1;
    if (photoMissing) missingPhotos += 1;
    if (reportMissing) missingReports += 1;
    if (!basicsMissing && !photoMissing && !reportMissing) readyTickets += 1;

    const jobId = recordJobId(ticket);
    if (!jobId) {
      unlinkedTickets += 1;
      return;
    }

    const job = jobMap.get(jobId) || ticket?.job || {};
    const summary = jobSummaries.get(jobId) || {
      jobId,
      label: ticket?.jobTitle || jobLabel(job, jobId),
      tickets: 0,
      yards: 0,
      missingBasics: 0,
      missingPhotos: 0,
      missingReports: 0,
      readyTickets: 0,
      blockers: [],
      tone: "slate",
    };

    summary.tickets += 1;
    summary.yards += yards;
    if (basicsMissing) summary.missingBasics += 1;
    if (photoMissing) summary.missingPhotos += 1;
    if (reportMissing) summary.missingReports += 1;
    if (!basicsMissing && !photoMissing && !reportMissing) summary.readyTickets += 1;
    jobSummaries.set(jobId, summary);
  });

  const jobRows = Array.from(jobSummaries.values()).map((summary) => {
    if (summary.missingBasics) summary.blockers.push(`${summary.missingBasics} basics gap${summary.missingBasics === 1 ? "" : "s"}`);
    if (summary.missingPhotos) summary.blockers.push(`${summary.missingPhotos} missing photo${summary.missingPhotos === 1 ? "" : "s"}`);
    if (summary.missingReports) summary.blockers.push(`${summary.missingReports} missing report link${summary.missingReports === 1 ? "" : "s"}`);
    return {
      ...summary,
      tone: summary.blockers.length ? "amber" : "green",
    };
  }).sort((left, right) => right.blockers.length - left.blockers.length || right.tickets - left.tickets || right.yards - left.yards || left.label.localeCompare(right.label));

  const jobsWithGaps = jobRows.filter((row) => row.blockers.length > 0).length;

  return {
    activeTickets,
    readyTickets,
    jobsWithGaps,
    unlinkedTickets,
    missingBasics,
    missingPhotos,
    missingReports,
    yardsLogged,
    topJobs: jobRows.slice(0, maxJobs),
    status: unlinkedTickets
      ? "Unlinked tickets need review"
      : missingBasics
        ? "Ticket basics needed"
        : missingPhotos || missingReports
          ? "Ticket evidence needed"
          : activeTickets
            ? "Delivery tickets closeout-ready"
            : "No active tickets",
    tone: unlinkedTickets || missingBasics ? "amber" : missingPhotos || missingReports ? "blue" : activeTickets ? "green" : "slate",
    nextAction: unlinkedTickets
      ? "Link tickets to jobs"
      : missingBasics
        ? "Complete ticket basics"
        : missingPhotos
          ? "Attach ticket photos"
          : missingReports
            ? "Link daily reports"
            : activeTickets
              ? "Ready for office review"
              : "Create a ticket",
  };
}

export function buildDeliveryTicketSupportContext({
  user = {},
  permissions = {},
  visibleRows = [],
  selectedTicket = null,
  filters = {},
  visibleJobs = [],
} = {}) {
  const safeRows = Array.isArray(visibleRows) ? visibleRows : [];
  const activeRows = safeRows.filter((ticket) => !ticket?.archivedAt);
  const missingPhotoCount = safeRows.filter((ticket) => !ticket?.ticketUploadId).length;
  const missingReportCount = safeRows.filter((ticket) => !ticket?.reportId).length;
  const incompleteBasicsCount = safeRows.filter(ticketMissingBasics).length;
  const archivedCount = safeRows.filter((ticket) => ticket?.archivedAt).length;
  const yardsLogged = safeRows.reduce((sum, ticket) => sum + Number(ticket?.yardsDelivered || 0), 0);
  const linkedPhotos = safeRows.filter((ticket) => ticket?.ticketUploadId).length;
  const linkedReports = safeRows.filter((ticket) => ticket?.reportId).length;
  const selectedText = selectedTicket
    ? [
      `${deliveryTicketTitle(selectedTicket)} for ${ticketJobLabel(selectedTicket)}`,
      `supplier ${selectedTicket.supplier || "Supplier pending"}`,
      `created by ${ticketCreatorLabel(selectedTicket)} on ${ticketDateLabel(selectedTicket)}`,
      `arrival/discharge reference: ${ticketTimeLabel(selectedTicket)}`,
      `photo ${selectedTicket.ticketUploadId ? "linked" : "not linked"}`,
      `daily report ${selectedTicket.reportId ? "linked" : "not linked"}`,
    ].join("; ")
    : "No delivery ticket selected.";
  const priorityItems = ticketSupportPriorityItems(activeRows);
  const priorityText = priorityItems.length
    ? priorityItems.map((item) => `${item.label}: ${item.reason}`).join("; ")
    : "No visible delivery ticket has missing basics, photo evidence, or report-link follow-up in this view.";
  const filterText = [
    `archive ${filters.archived || "Active"}`,
    `job ${filters.job || "All jobs"}`,
    `supplier ${filters.supplier || "All suppliers"}`,
    `creator ${filters.createdBy || "All creators"}`,
    `date ${filters.date || "All dates"}`,
    filters.search ? `search "${filters.search}"` : "",
  ].filter(Boolean).join("; ");

  return {
    workflow: "Tickets / checklists",
    blockerLevel: incompleteBasicsCount || missingPhotoCount || missingReportCount ? "Slowing work down" : "Not a blocker",
    followUpNeeded: incompleteBasicsCount || missingPhotoCount || missingReportCount ? "Manual delivery ticket review" : "Delivery ticket workflow question",
    summary: [
      `Delivery Tickets support request for ${String(user?.name || user?.email || "workspace user").trim() || "workspace user"}.`,
      `Scope: ${ticketSupportScopeLabel(user, permissions)}.`,
      `Current filters: ${filterText}.`,
      `Visible tickets: ${safeRows.length}; active: ${activeRows.length}; linked photos: ${linkedPhotos}; linked daily reports: ${linkedReports}; missing photos: ${missingPhotoCount}; missing reports: ${missingReportCount}; incomplete basics: ${incompleteBasicsCount}; archived in view: ${archivedCount}; yards logged: ${yardsLogged}.`,
      `Selected ticket: ${selectedText}`,
    ].join(" "),
    expected: "Keep delivery tickets tied to visible jobs only, without exposing linked upload file contents, storage paths, content URLs, GPS coordinates, pricing, margin, payroll, hidden users, or unrelated jobs.",
    workaround: `Visible job options: ${pluralize(Array.isArray(visibleJobs) ? visibleJobs.length : 0, "job")}. Review queue in this view: ${priorityText}`,
  };
}
