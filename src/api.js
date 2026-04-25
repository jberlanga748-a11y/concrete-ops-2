function backendUnavailableMessage() {
  return "Cannot reach the Concrete Ops API. Start the app with `npm run dev` or `npm run serve`.";
}

async function request(path, { method = "GET", token, body } = {}) {
  let response;

  try {
    response = await fetch(path, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    const error = new Error(backendUnavailableMessage());
    error.status = 0;
    error.code = "BACKEND_UNAVAILABLE";
    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") || "";
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const isApiPath = path.startsWith("/api");
    const missingBackendResponse = isApiPath && (!contentType.includes("application/json") || response.status >= 500);
    const error = new Error(payload.error || (missingBackendResponse ? backendUnavailableMessage() : "Request failed."));
    error.status = response.status;
    if (missingBackendResponse) {
      error.code = "BACKEND_UNAVAILABLE";
    }
    throw error;
  }

  return payload;
}

export function login(credentials) {
  return request("/api/auth/login", { method: "POST", body: credentials });
}

export function getSetupStatus() {
  return request("/api/setup/status");
}

export function bootstrapAdminAccount(payload) {
  return request("/api/setup/bootstrap-admin", { method: "POST", body: payload });
}

export function logout(token) {
  return request("/api/auth/logout", { method: "POST", token });
}

export function getBootstrap(token) {
  return request("/api/bootstrap", { token });
}

export function createCustomer(token, customer) {
  return request("/api/customers", { method: "POST", token, body: customer });
}

export function updateCustomer(token, id, customer) {
  return request(`/api/customers/${id}`, { method: "PATCH", token, body: customer });
}

export function archiveCustomer(token, id) {
  return request(`/api/customers/${id}/archive`, { method: "POST", token });
}

export function restoreCustomer(token, id) {
  return request(`/api/customers/${id}/restore`, { method: "POST", token });
}

export function createLead(token, lead) {
  return request("/api/leads", { method: "POST", token, body: lead });
}

export function updateLead(token, id, lead) {
  return request(`/api/leads/${id}`, { method: "PATCH", token, body: lead });
}

export function archiveLead(token, id) {
  return request(`/api/leads/${id}/archive`, { method: "POST", token });
}

export function restoreLead(token, id) {
  return request(`/api/leads/${id}/restore`, { method: "POST", token });
}

export function deleteLead(token, id) {
  return request(`/api/leads/${id}`, { method: "DELETE", token });
}

export function convertLead(token, id) {
  return request(`/api/leads/${id}/convert`, { method: "POST", token });
}

export function convertLeadToCustomer(token, id) {
  return request(`/api/leads/${id}/convert-to-customer`, { method: "POST", token });
}

export function createJob(token, job) {
  return request("/api/jobs", { method: "POST", token, body: job });
}

export function updateJob(token, id, job) {
  return request(`/api/jobs/${id}`, { method: "PATCH", token, body: job });
}

export function archiveJob(token, id) {
  return request(`/api/jobs/${id}/archive`, { method: "POST", token });
}

export function restoreJob(token, id) {
  return request(`/api/jobs/${id}/restore`, { method: "POST", token });
}

export function deleteJob(token, id) {
  return request(`/api/jobs/${id}`, { method: "DELETE", token });
}

export function createJobAssignment(token, jobId, assignment) {
  return request(`/api/jobs/${jobId}/assignments`, { method: "POST", token, body: assignment });
}

export function updateJobAssignment(token, jobId, assignmentId, assignment) {
  return request(`/api/jobs/${jobId}/assignments/${assignmentId}`, { method: "PATCH", token, body: assignment });
}

export function deleteJobAssignment(token, jobId, assignmentId) {
  return request(`/api/jobs/${jobId}/assignments/${assignmentId}`, { method: "DELETE", token });
}

export function createQueueItem(token, task) {
  return request("/api/queue-items", { method: "POST", token, body: task });
}

export function archiveQueueItem(token, id) {
  return request(`/api/queue-items/${id}/archive`, { method: "POST", token });
}

export function restoreQueueItem(token, id) {
  return request(`/api/queue-items/${id}/restore`, { method: "POST", token });
}

export function deleteQueueItem(token, id) {
  return request(`/api/queue-items/${id}`, { method: "DELETE", token });
}

export function toggleQueueItem(token, id) {
  return request(`/api/queue-items/${id}/toggle`, { method: "PATCH", token });
}

export function resetWorkspace(token) {
  return request("/api/reset", { method: "POST", token });
}

export function getHealth() {
  return request("/api/health");
}
