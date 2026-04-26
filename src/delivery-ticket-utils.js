export function deliveryTicketTitle(ticket) {
  if (!ticket) return "Delivery ticket";
  return ticket.ticketNumber || ticket.truckNumber || ticket.supplier || "Delivery ticket";
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
