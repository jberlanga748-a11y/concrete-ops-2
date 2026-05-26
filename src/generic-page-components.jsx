import { Badge, Card, PageHeader, SectionHeader } from "./app-shell-components";
import { jobNextStep, jobTitle } from "./job-utils";

export function GenericPage({ active, navGroups = [], queueItems, selectedLead, selectedJob }) {
  const item = navGroups.flatMap((group) => group.items || []).find((nav) => nav.id === active);
  const safeQueueItems = Array.isArray(queueItems) ? queueItems : [];
  const previews = [
    selectedLead ? `${selectedLead.customer} - ${selectedLead.nextStep}` : "Select a lead to see live queue context.",
    selectedJob ? `${jobTitle(selectedJob)} - ${jobNextStep(selectedJob)}` : "Select a job to keep next steps visible.",
    safeQueueItems[0] ? `${safeQueueItems[0].title} - ${safeQueueItems[0].status}` : "Queue items will appear here as they are added.",
  ];

  return (
    <div className="co-office-page co-generic-page">
      <PageHeader eyebrow="Workspace" title={item?.label || "Workspace"} description="This area keeps the Apex HQ command-board shell active while workspace access is being resolved." actions={<Badge tone="slate">Workspace</Badge>} />
      <div className="grid min-w-0 gap-4 px-5 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <Card className="p-5">
          <SectionHeader title="Workspace Context" description="Live record context remains visible without exposing office-only data to the wrong role." />
          <div className="space-y-3">{previews.map((preview) => <div key={preview} className="rounded-2xl border border-blue-100 p-4 text-sm text-slate-600">{preview}</div>)}</div>
        </Card>
        <Card className="p-5">
          <SectionHeader title="Operator Guidance" description="Use the approved navigation areas to continue work from the current workspace." />
          <p className="text-sm leading-6 text-slate-600">Open the closest command board for the record you need, then continue with the existing saved workflow and role-safe data.</p>
        </Card>
      </div>
    </div>
  );
}
