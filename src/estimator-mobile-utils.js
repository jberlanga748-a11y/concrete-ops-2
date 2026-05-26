export function isEstimatorMobilePipelineUser(user = {}, permissions = {}) {
  const role = String(user?.role || "").trim().toLowerCase();
  return ["owner", "administrator", "operations manager", "estimator"].includes(role)
    && Boolean(permissions?.leads?.canView)
    && Boolean(permissions?.estimates?.canView);
}
