function backendUnavailableMessage() {
  return "Cannot reach the Apex HQ API. Start the app with `npm run dev` or `npm run serve`.";
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
    error.payload = payload;
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

export function activateInvite(payload) {
  return request("/api/auth/activate-invite", { method: "POST", body: payload });
}

export function requestPasswordReset(payload) {
  return request("/api/auth/password-reset/request", { method: "POST", body: payload });
}

export function completePasswordReset(payload) {
  return request("/api/auth/password-reset/complete", { method: "POST", body: payload });
}

export function getSetupStatus() {
  return request("/api/setup/status");
}

export function bootstrapAdminAccount(payload) {
  return request("/api/setup/bootstrap-admin", { method: "POST", body: payload });
}

export function signupCompany(payload) {
  return request("/api/signup/company", { method: "POST", body: payload });
}

export function submitPublicEstimateRequest(payload) {
  return request("/api/public/estimate-request", { method: "POST", body: payload });
}

export function submitPublicDemoInterest(payload) {
  return request("/api/public/demo-interest", { method: "POST", body: payload });
}

export function logout(token) {
  return request("/api/auth/logout", { method: "POST", token });
}

export function getBootstrap(token) {
  return request("/api/bootstrap", { token });
}

export function getAgentContext(token) {
  return request("/api/agent/context", { token });
}

export function exportCompanyData(token) {
  return request("/api/export/company", { token });
}

export function getOwnerHealth(token) {
  return request("/api/owner-health", { token });
}

export function selectCompany(token, companyId) {
  return request("/api/companies/select", { method: "POST", token, body: { companyId } });
}

export function updateNotificationState(token, payload) {
  return request("/api/auth/me/notification-state", { method: "PATCH", token, body: payload });
}

export function recordAgentActionProposalAudit(token, payload) {
  return request("/api/agent-action-proposals/audit", { method: "POST", token, body: payload });
}

export function createAgentEstimateDraft(token, payload) {
  return request("/api/agent-action-proposals/create-estimate-draft", { method: "POST", token, body: payload });
}

export function prepareAgentEstimateSend(token, payload) {
  return request("/api/agent-action-proposals/prepare-estimate-send", { method: "POST", token, body: payload });
}

export function convertAgentEstimateToJob(token, payload) {
  return request("/api/agent-action-proposals/convert-estimate-to-job", { method: "POST", token, body: payload });
}

export function getAgentLearningPreferences(token) {
  return request("/api/agent/learning-preferences", { token });
}

export function createAgentLearningPreference(token, payload) {
  return request("/api/agent/learning-preferences", { method: "POST", token, body: payload });
}

export function suggestAgentLearningFromEstimates(token) {
  return request("/api/agent/learning-preferences/suggest-from-estimates", { method: "POST", token });
}

export function suggestAgentLearningFromCloseouts(token) {
  return request("/api/agent/learning-preferences/suggest-from-closeouts", { method: "POST", token });
}

export function updateAgentLearningPreference(token, id, payload) {
  return request(`/api/agent/learning-preferences/${id}`, { method: "PATCH", token, body: payload });
}

export function updateCompanySettings(token, payload) {
  return request("/api/settings/company", { method: "PATCH", token, body: payload });
}

export function createCustomer(token, customer) {
  return request("/api/customers", { method: "POST", token, body: customer });
}

export function getUsers(token) {
  return request("/api/users", { token });
}

export function createUser(token, payload) {
  return request("/api/users", { method: "POST", token, body: payload });
}

export function resendUserInvite(token, id) {
  return request(`/api/users/${id}/invite`, { method: "POST", token });
}

export function updateUser(token, id, payload) {
  return request(`/api/users/${id}`, { method: "PATCH", token, body: payload });
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

export function getContactHistory(token, params = {}) {
  const searchParams = new URLSearchParams();
  if (params.entityType) searchParams.set("entityType", params.entityType);
  if (params.entityId) searchParams.set("entityId", params.entityId);
  const query = searchParams.toString();
  return request(`/api/contact-history${query ? `?${query}` : ""}`, { token });
}

export function createContactHistory(token, payload) {
  return request("/api/contact-history", { method: "POST", token, body: payload });
}

export function updateContactHistory(token, id, payload) {
  return request(`/api/contact-history/${id}`, { method: "PATCH", token, body: payload });
}

export function archiveContactHistory(token, id) {
  return request(`/api/contact-history/${id}/archive`, { method: "POST", token });
}

export function restoreContactHistory(token, id) {
  return request(`/api/contact-history/${id}/restore`, { method: "POST", token });
}

export function createLead(token, lead) {
  return request("/api/leads", { method: "POST", token, body: lead });
}

export function createLeadSource(token, source) {
  return request("/api/lead-sources", { method: "POST", token, body: source });
}

export function updateLeadSource(token, id, source) {
  return request(`/api/lead-sources/${id}`, { method: "PATCH", token, body: source });
}

export function archiveLeadSource(token, id) {
  return request(`/api/lead-sources/${id}/archive`, { method: "POST", token });
}

export function restoreLeadSource(token, id) {
  return request(`/api/lead-sources/${id}/restore`, { method: "POST", token });
}

export function markLeadSourceChecked(token, id, payload = {}) {
  return request(`/api/lead-sources/${id}/check`, { method: "POST", token, body: payload });
}

export function getOpportunityScout(token) {
  return request("/api/opportunity-scout", { token });
}

export function createOpportunitySearchProfile(token, payload) {
  return request("/api/opportunity-scout/search-profiles", { method: "POST", token, body: payload });
}

export function updateOpportunitySearchProfile(token, id, payload) {
  return request(`/api/opportunity-scout/search-profiles/${id}`, { method: "PATCH", token, body: payload });
}

export function planOpportunitySearchWithAi(token, id) {
  return request(`/api/ai/opportunity-scout/search-profiles/${id}/search-plan`, { method: "POST", token });
}

export function previewOpportunityScoutAgent(token, payload) {
  return request("/api/ai/opportunity-scout/agent-preview", { method: "POST", token, body: payload });
}

export function createFoundOpportunity(token, payload) {
  return request("/api/opportunity-scout/found-opportunities", { method: "POST", token, body: payload });
}

export function updateFoundOpportunity(token, id, payload) {
  return request(`/api/opportunity-scout/found-opportunities/${id}`, { method: "PATCH", token, body: payload });
}

export function convertFoundOpportunityToLead(token, id) {
  return request(`/api/opportunity-scout/found-opportunities/${id}/convert-to-lead`, { method: "POST", token });
}

export function reviewFoundOpportunityWithAi(token, id) {
  return request(`/api/ai/opportunity-scout/found-opportunities/${id}/review`, { method: "POST", token });
}

export function getEstimates(token) {
  return request("/api/estimates", { token });
}

export function createEstimate(token, payload) {
  return request("/api/estimates", { method: "POST", token, body: payload });
}

export function updateEstimate(token, id, payload) {
  return request(`/api/estimates/${id}`, { method: "PATCH", token, body: payload });
}

export function sendEstimate(token, id, payload = {}) {
  return request(`/api/estimates/${id}/send`, { method: "POST", token, body: payload });
}

export function convertEstimateToJob(token, id, payload = {}) {
  return request(`/api/estimates/${id}/convert-to-job`, { method: "POST", token, body: payload });
}

export function getRateBookItems(token) {
  return request("/api/rate-book", { token });
}

export function createRateBookItem(token, payload) {
  return request("/api/rate-book", { method: "POST", token, body: payload });
}

export function updateRateBookItem(token, id, payload) {
  return request(`/api/rate-book/${id}`, { method: "PATCH", token, body: payload });
}

export function archiveRateBookItem(token, id) {
  return request(`/api/rate-book/${id}/archive`, { method: "POST", token });
}

export function restoreRateBookItem(token, id) {
  return request(`/api/rate-book/${id}/restore`, { method: "POST", token });
}

export function assistEstimateRoughNotes(token, payload) {
  return request("/api/ai/estimates/rough-notes", { method: "POST", token, body: payload });
}

export function updateLead(token, id, lead) {
  return request(`/api/leads/${id}`, { method: "PATCH", token, body: lead });
}

export function scoreLead(token, id) {
  return request(`/api/leads/${id}/score`, { method: "POST", token });
}

export function checkLeadMissingInfo(token, id) {
  return request(`/api/leads/${id}/check-missing-info`, { method: "POST", token });
}

export function assistLead(token, id) {
  return request(`/api/ai/leads/${id}/assist`, { method: "POST", token });
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

export function importJobDraftPackage(token, packageJson, options = {}) {
  return request("/api/job-draft-imports", { method: "POST", token, body: { package: packageJson, ...options } });
}

export function updateJobDraftImport(token, id, draft) {
  return request(`/api/job-draft-imports/${id}`, { method: "PATCH", token, body: draft });
}

export function createJobFromImportedDraft(token, id, options = {}) {
  return request(`/api/job-draft-imports/${id}/create-job`, { method: "POST", token, body: options });
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

export function acknowledgeJobAssignmentNotice(token, jobId) {
  return request(`/api/jobs/${jobId}/assignment-notice/acknowledge`, { method: "POST", token });
}

export function getTimeEntries(token) {
  return request("/api/time-entries", { token });
}

export function getDailyReports(token) {
  return request("/api/daily-reports", { token });
}

export function getChangeOrderRequests(token) {
  return request("/api/change-order-requests", { token });
}

export function createChangeOrderRequest(token, payload) {
  return request("/api/change-order-requests", { method: "POST", token, body: payload });
}

export function updateChangeOrderRequest(token, id, payload) {
  return request(`/api/change-order-requests/${id}`, { method: "PATCH", token, body: payload });
}

export function archiveChangeOrderRequest(token, id) {
  return request(`/api/change-order-requests/${id}/archive`, { method: "POST", token });
}

export function getDeliveryTickets(token) {
  return request("/api/delivery-tickets", { token });
}

export function createDeliveryTicket(token, payload) {
  return request("/api/delivery-tickets", { method: "POST", token, body: payload });
}

export function updateDeliveryTicket(token, id, payload) {
  return request(`/api/delivery-tickets/${id}`, { method: "PATCH", token, body: payload });
}

export function archiveDeliveryTicket(token, id) {
  return request(`/api/delivery-tickets/${id}/archive`, { method: "POST", token });
}

export function getUploads(token) {
  return request("/api/uploads", { token });
}

export function createUpload(token, payload) {
  return request("/api/uploads", { method: "POST", token, body: payload });
}

export function getSafety(token) {
  return request("/api/safety", { token });
}

export function createSafetyPolicy(token, payload) {
  return request("/api/safety/policies", { method: "POST", token, body: payload });
}

export function updateSafetyPolicy(token, id, payload) {
  return request(`/api/safety/policies/${id}`, { method: "PATCH", token, body: payload });
}

export function archiveSafetyPolicy(token, id) {
  return request(`/api/safety/policies/${id}/archive`, { method: "POST", token });
}

export function createPpeItem(token, payload) {
  return request("/api/safety/ppe-items", { method: "POST", token, body: payload });
}

export function updatePpeItem(token, id, payload) {
  return request(`/api/safety/ppe-items/${id}`, { method: "PATCH", token, body: payload });
}

export function archivePpeItem(token, id) {
  return request(`/api/safety/ppe-items/${id}/archive`, { method: "POST", token });
}

export function acknowledgeSafety(token, payload) {
  return request("/api/safety/acknowledgments", { method: "POST", token, body: payload });
}

export function createSafetyIncident(token, payload) {
  return request("/api/safety/incidents", { method: "POST", token, body: payload });
}

export function reviewSafetyIncident(token, id) {
  return request(`/api/safety/incidents/${id}/review`, { method: "POST", token });
}

export function resolveSafetyIncident(token, id) {
  return request(`/api/safety/incidents/${id}/resolve`, { method: "POST", token });
}

export function archiveSafetyIncident(token, id) {
  return request(`/api/safety/incidents/${id}/archive`, { method: "POST", token });
}

export function getToolChecklists(token) {
  return request("/api/tool-checklists", { token });
}

export function createToolChecklist(token, payload) {
  return request("/api/tool-checklists", { method: "POST", token, body: payload });
}

export function updateToolChecklist(token, id, payload) {
  return request(`/api/tool-checklists/${id}`, { method: "PATCH", token, body: payload });
}

export function addToolChecklistItem(token, checklistId, payload) {
  return request(`/api/tool-checklists/${checklistId}/items`, { method: "POST", token, body: payload });
}

export function updateToolChecklistItem(token, checklistId, itemId, payload) {
  return request(`/api/tool-checklists/${checklistId}/items/${itemId}`, { method: "PATCH", token, body: payload });
}

export function submitToolChecklist(token, id) {
  return request(`/api/tool-checklists/${id}/submit`, { method: "POST", token });
}

export function reviewToolChecklist(token, id) {
  return request(`/api/tool-checklists/${id}/review`, { method: "POST", token });
}

export function archiveToolChecklist(token, id) {
  return request(`/api/tool-checklists/${id}/archive`, { method: "POST", token });
}

export function getPrePourChecklists(token) {
  return request("/api/pre-pour-checklists", { token });
}

export function createPrePourChecklist(token, payload) {
  return request("/api/pre-pour-checklists", { method: "POST", token, body: payload });
}

export function updatePrePourChecklist(token, id, payload) {
  return request(`/api/pre-pour-checklists/${id}`, { method: "PATCH", token, body: payload });
}

export function updatePrePourChecklistItem(token, checklistId, itemId, payload) {
  return request(`/api/pre-pour-checklists/${checklistId}/items/${itemId}`, { method: "PATCH", token, body: payload });
}

export function completePrePourChecklist(token, id) {
  return request(`/api/pre-pour-checklists/${id}/complete`, { method: "POST", token });
}

export function reviewPrePourChecklist(token, id) {
  return request(`/api/pre-pour-checklists/${id}/review`, { method: "POST", token });
}

export function reopenPrePourChecklist(token, id) {
  return request(`/api/pre-pour-checklists/${id}/reopen`, { method: "POST", token });
}

export function archivePrePourChecklist(token, id) {
  return request(`/api/pre-pour-checklists/${id}/archive`, { method: "POST", token });
}

export function getPostPourChecklists(token) {
  return request("/api/post-pour-checklists", { token });
}

export function createPostPourChecklist(token, payload) {
  return request("/api/post-pour-checklists", { method: "POST", token, body: payload });
}

export function updatePostPourChecklist(token, id, payload) {
  return request(`/api/post-pour-checklists/${id}`, { method: "PATCH", token, body: payload });
}

export function updatePostPourChecklistItem(token, checklistId, itemId, payload) {
  return request(`/api/post-pour-checklists/${checklistId}/items/${itemId}`, { method: "PATCH", token, body: payload });
}

export function completePostPourChecklist(token, id) {
  return request(`/api/post-pour-checklists/${id}/complete`, { method: "POST", token });
}

export function reviewPostPourChecklist(token, id) {
  return request(`/api/post-pour-checklists/${id}/review`, { method: "POST", token });
}

export function reopenPostPourChecklist(token, id) {
  return request(`/api/post-pour-checklists/${id}/reopen`, { method: "POST", token });
}

export function archivePostPourChecklist(token, id) {
  return request(`/api/post-pour-checklists/${id}/archive`, { method: "POST", token });
}

export function updateUpload(token, id, payload) {
  return request(`/api/uploads/${id}`, { method: "PATCH", token, body: payload });
}

export function archiveUpload(token, id) {
  return request(`/api/uploads/${id}/archive`, { method: "POST", token });
}

export function createCalculatorResult(token, payload) {
  return request("/api/calculator-results", { method: "POST", token, body: payload });
}

export function createDailyReport(token, payload) {
  return request("/api/daily-reports", { method: "POST", token, body: payload });
}

export function updateDailyReport(token, id, payload) {
  return request(`/api/daily-reports/${id}`, { method: "PATCH", token, body: payload });
}

export function submitDailyReport(token, id) {
  return request(`/api/daily-reports/${id}/submit`, { method: "POST", token });
}

export function reviewDailyReport(token, id) {
  return request(`/api/daily-reports/${id}/review`, { method: "POST", token });
}

export function reopenDailyReport(token, id) {
  return request(`/api/daily-reports/${id}/reopen`, { method: "POST", token });
}

export function archiveDailyReport(token, id) {
  return request(`/api/daily-reports/${id}/archive`, { method: "POST", token });
}

export function clockIn(token, payload) {
  return request("/api/time-entries/clock-in", { method: "POST", token, body: payload });
}

export function startBreak(token, id) {
  return request(`/api/time-entries/${id}/break-start`, { method: "POST", token });
}

export function endBreak(token, id) {
  return request(`/api/time-entries/${id}/break-end`, { method: "POST", token });
}

export function clockOut(token, id) {
  return request(`/api/time-entries/${id}/clock-out`, { method: "POST", token });
}

export function correctTimeEntry(token, id, payload) {
  return request(`/api/time-entries/${id}`, { method: "PATCH", token, body: payload });
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
