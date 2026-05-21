export function estimateRoughNotesText(value) {
  return String(value ?? "").trim();
}

export function estimateRoughNotesBullets(values = []) {
  return (Array.isArray(values) ? values : [])
    .map((value) => estimateRoughNotesText(value))
    .filter(Boolean)
    .map((value) => `- ${value}`)
    .join("\n");
}

export function hasMeaningfulEstimateItems(items = []) {
  return Array.isArray(items) && items.some((item) => estimateRoughNotesText(item?.description) || estimateRoughNotesText(item?.unitPrice));
}

export function estimateRoughNotesHasSuggestions(result = null) {
  return Boolean(
    result?.ok
    && (
      estimateRoughNotesText(result.suggestedTitle)
      || estimateRoughNotesText(result.customerName)
      || estimateRoughNotesText(result.projectName)
      || estimateRoughNotesText(result.jobLocation)
      || estimateRoughNotesText(result.scopeOfWork)
      || estimateRoughNotesBullets(result.inclusions)
      || estimateRoughNotesBullets(result.exclusions)
      || estimateRoughNotesBullets(result.assumptions)
      || estimateRoughNotesText(result.customerNotes)
      || estimateRoughNotesText(result.gcProposalSummary)
      || estimateRoughNotesText(result.gcCoverNote)
      || estimateRoughNotesText(result.gcQualifications)
    )
  );
}
