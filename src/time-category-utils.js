export function workCategoryLabel(workCategory = "") {
  const labels = {
    job: "Job",
    office_admin: "Office/Admin",
    estimating: "Estimating",
    lead_follow_up: "Lead Follow-up",
    shop_yard: "Shop/Yard",
    travel: "Travel",
    training: "Training",
    meeting: "Meeting",
    maintenance: "Maintenance",
    other: "Other",
  };

  return labels[workCategory] || "Other";
}
