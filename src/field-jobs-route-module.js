export const FIELD_JOBS_ROUTE_MODULE_IDS = Object.freeze(["fieldWorkspace", "jobs"]);

export const FIELD_JOBS_ROUTE_MODULES = Object.freeze({
  fieldWorkspace: Object.freeze({
    id: "fieldWorkspace",
    path: "/field",
    label: "Field Workspace",
    workspace: "field",
    componentKey: "FieldWorkspaceLeaderPage",
    surfaces: Object.freeze(["phone", "tablet", "desktop"]),
    priority: "leader",
  }),
  jobs: Object.freeze({
    id: "jobs",
    path: "/jobs",
    label: "Jobs",
    workspace: "field",
    componentKey: "JobsPage",
    surfaces: Object.freeze(["phone", "tablet", "desktop"]),
    priority: "core",
  }),
});

export function getFieldJobsRouteModule(active) {
  return FIELD_JOBS_ROUTE_MODULES[active] || null;
}

export function buildFieldJobsRouteProps(active, props) {
  if (active === "fieldWorkspace") {
    return props;
  }

  if (active !== "jobs") {
    return null;
  }

  return {
    ...props,
    rows: props.visibleJobs,
    filter: props.jobFilter,
    setFilter: props.setJobFilter,
    search: props.jobSearch,
    setSearch: props.setJobSearch,
    customerFilter: props.jobCustomerFilter,
    setCustomerFilter: props.setJobCustomerFilter,
    foremanFilter: props.jobForemanFilter,
    setForemanFilter: props.setJobForemanFilter,
    dateFilter: props.jobDateFilter,
    setDateFilter: props.setJobDateFilter,
    startupFilter: props.jobStartupFilter,
    setStartupFilter: props.setJobStartupFilter,
    assistantJobHandoffSeed: props.assistantJobHandoffSeed,
    onAssistantJobHandoffSeedHandled: props.onAssistantJobHandoffSeedHandled,
  };
}
