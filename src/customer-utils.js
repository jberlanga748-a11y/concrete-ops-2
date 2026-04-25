function containsQuery(value, query) {
  return String(value || "").toLowerCase().includes(query);
}

export function filterCustomers(customers, { status = "All", query = "" } = {}) {
  const normalizedQuery = String(query).trim().toLowerCase();
  return customers.filter((customer) => {
    const matchesArchive = status === "Archived" ? Boolean(customer.archivedAt) : !customer.archivedAt;
    const matchesStatus = status === "All" || status === "Archived" ? true : customer.status === status;
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

export function relatedCustomerRecords(customer, leads, jobs, activity) {
  if (!customer) {
    return {
      leads: [],
      jobs: [],
      activity: [],
    };
  }

  const normalizedName = String(customer.name || "").toLowerCase();
  const relatedLeads = leads.filter((lead) => lead.customerId === customer.id || String(lead.customer || "").toLowerCase() === normalizedName);
  const relatedJobs = jobs.filter((job) => job.customerId === customer.id || String(job.customer || "").toLowerCase() === normalizedName);
  const relatedActivity = activity.filter((entry) => {
    const haystack = `${entry.title || ""} ${entry.detail || ""}`.toLowerCase();
    return haystack.includes(normalizedName);
  });

  return {
    leads: relatedLeads,
    jobs: relatedJobs,
    activity: relatedActivity,
  };
}
