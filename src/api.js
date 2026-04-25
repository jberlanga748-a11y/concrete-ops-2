async function request(path, { method = "GET", token, body } = {}) {
  const response = await fetch(path, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 204) {
    return null;
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload.error || "Request failed.");
    error.status = response.status;
    throw error;
  }

  return payload;
}

export function login(credentials) {
  return request("/api/auth/login", { method: "POST", body: credentials });
}

export function logout(token) {
  return request("/api/auth/logout", { method: "POST", token });
}

export function getBootstrap(token) {
  return request("/api/bootstrap", { token });
}

export function createLead(token, lead) {
  return request("/api/leads", { method: "POST", token, body: lead });
}

export function updateLead(token, id, lead) {
  return request(`/api/leads/${id}`, { method: "PATCH", token, body: lead });
}

export function convertLead(token, id) {
  return request(`/api/leads/${id}/convert`, { method: "POST", token });
}

export function createJob(token, job) {
  return request("/api/jobs", { method: "POST", token, body: job });
}

export function updateJob(token, id, job) {
  return request(`/api/jobs/${id}`, { method: "PATCH", token, body: job });
}

export function createQueueItem(token, task) {
  return request("/api/queue-items", { method: "POST", token, body: task });
}

export function toggleQueueItem(token, id) {
  return request(`/api/queue-items/${id}/toggle`, { method: "PATCH", token });
}

export function resetWorkspace(token) {
  return request("/api/reset", { method: "POST", token });
}
