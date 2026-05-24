function containsQuery(value, query) {
  return String(value || "").toLowerCase().includes(query);
}

export function filterCustomers(customers, { status = "All", query = "" } = {}) {
  const normalizedStatus = String(status).trim().toLowerCase();
  const normalizedQuery = String(query).trim().toLowerCase();
  return customers.filter((customer) => {
    const customerStatus = String(customer.status || "").trim().toLowerCase();
    const matchesArchive = normalizedStatus === "archived" ? Boolean(customer.archivedAt) : !customer.archivedAt;
    const matchesStatus = normalizedStatus === "all" || normalizedStatus === "archived" ? true : customerStatus === normalizedStatus;
    const matchesQuery = !normalizedQuery || [
      customer.name,
      customer.company,
      customer.phone,
      customer.email,
      customer.city,
      customer.serviceArea,
      customer.status,
    ].some((value) => containsQuery(value, normalizedQuery));
    return matchesArchive && matchesStatus && matchesQuery;
  });
}

export function deriveCustomerListState(customers, { status = "All", query = "" } = {}) {
  const filteredCustomers = filterCustomers(customers, { status, query });
  const preview = filteredCustomers.slice(0, 5).map((customer) => ({
    name: customer.name,
    status: customer.archivedAt ? "Archived" : customer.status,
  }));

  return {
    totalCount: customers.length,
    filterValue: status,
    searchValue: query,
    filteredCustomers,
    filteredCount: filteredCustomers.length,
    renderedRows: filteredCustomers,
    renderedRowCount: filteredCustomers.length,
    filteredPreview: preview,
    renderedPreview: preview,
  };
}

export function relatedCustomerRecords(customer, leads, jobs, activity) {
  if (!customer) {
    return {
      leads: [],
      jobs: [],
      activity: [],
    };
  }

  const normalizedName = String(customer.name || "").trim().toLowerCase();
  const hasName = normalizedName.length > 0;
  const relatedLeads = leads.filter((lead) => lead.customerId === customer.id || (hasName && String(lead.customer || "").trim().toLowerCase() === normalizedName));
  const relatedJobs = jobs.filter((job) => job.customerId === customer.id || (hasName && String(job.customer || "").trim().toLowerCase() === normalizedName));
  const relatedActivity = activity.filter((entry) => {
    if (!hasName) return false;
    const haystack = `${entry.title || ""} ${entry.detail || ""}`.toLowerCase();
    return haystack.includes(normalizedName);
  });

  return {
    leads: relatedLeads,
    jobs: relatedJobs,
    activity: relatedActivity,
  };
}
