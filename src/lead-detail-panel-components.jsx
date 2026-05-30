import {
  Badge,
  Button,
  Card,
  Icon,
  InputField,
  SectionHeader,
  SelectField,
  StatusBadge,
  TextAreaField,
} from "./app-shell-components";
import { SaveStateText, TimestampMeta } from "./app-status-components";
import { ContactHistoryPanel } from "./contact-history-route-components";
import {
  LEAD_SOURCE_OPTIONS,
  LeadAiAssistantCard,
  LeadMissingInfoCard,
  LeadPilotWorkflowReadinessCard,
  LeadScoreCard,
} from "./lead-route-components";

function formatDateTime(value) {
  if (!value) return "Not recorded";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not recorded";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

export function LeadDetailPanel({
  lead,
  onFieldChange,
  onCreateJob,
  onCreateEstimateFromLead = () => {},
  onScoreLead = () => {},
  onCheckMissingInfo = () => {},
  onGenerateLeadAssistant = () => {},
  onConvertToCustomer = () => {},
  onArchive,
  onRestore,
  onDelete,
  onSelectCustomer = () => {},
  related = { customer: null, activity: [], statusHistory: [] },
  users = [],
  customers = [],
  contactHistory = [],
  contactHistoryPermissions,
  onCreateContactHistory,
  onUpdateContactHistory,
  onArchiveContactHistory,
  onRestoreContactHistory,
  disabled,
  saveState,
  canManage = true,
  canCreateEstimate = false,
  leadAssistantState = null,
}) {
  if (!lead) {
    return (
      <Card className="p-5">
        <SectionHeader title="Lead details" description="Select a lead to edit ownership, next steps, and notes." />
        <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50 p-6 text-center text-sm text-slate-500">Pick a lead from the table to inspect and update it.</div>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <SectionHeader
        title={lead.customer}
        description={`${lead.id} / ${lead.city}`}
        action={
          <div className="grid w-full gap-2 sm:flex sm:w-auto sm:flex-wrap">
            {!canManage ? <Badge tone="slate">Read only</Badge> : null}
            {lead.archivedAt ? <Badge tone="slate">Archived</Badge> : null}
            <Button size="sm" className="w-full sm:w-auto" onClick={onConvertToCustomer} disabled={disabled || Boolean(lead.archivedAt) || !canManage}>
              <Icon name="users" />
              Convert to customer
            </Button>
            <Button size="sm" className="w-full sm:w-auto" onClick={onCreateJob} disabled={disabled || Boolean(lead.archivedAt) || !canManage}>
              <Icon name="arrowUpRight" />
              Create job
            </Button>
            {lead.archivedAt ? (
              <>
                <Button variant="secondary" size="sm" className="w-full sm:w-auto" onClick={onRestore} disabled={disabled || !canManage}>Restore</Button>
                <Button variant="danger" size="sm" className="w-full sm:w-auto" onClick={onDelete} disabled={disabled || !canManage}>Delete</Button>
              </>
            ) : (
              <Button variant="secondary" size="sm" className="w-full sm:w-auto" onClick={onArchive} disabled={disabled || !canManage}>Archive</Button>
            )}
          </div>
        }
      />
      <SaveStateText saveState={saveState} />
      <div className="grid gap-3">
        <TimestampMeta createdAt={lead.createdAt} updatedAt={lead.updatedAt} />
        <LeadPilotWorkflowReadinessCard lead={lead} customers={customers} />
        <LeadScoreCard lead={lead} canManage={canManage} disabled={disabled} onScoreLead={onScoreLead} />
        <LeadMissingInfoCard lead={lead} canManage={canManage} disabled={disabled} onCheckMissingInfo={onCheckMissingInfo} />
        <LeadAiAssistantCard
          lead={lead}
          canManage={canManage}
          disabled={disabled}
          assistant={leadAssistantState?.leadId === lead.id ? leadAssistantState : null}
          onGenerateLeadAssistant={onGenerateLeadAssistant}
        />
        <ContactHistoryPanel
          entityType="lead"
          entity={lead}
          records={contactHistory}
          permissions={contactHistoryPermissions}
          disabled={disabled}
          onCreate={onCreateContactHistory}
          onUpdate={onUpdateContactHistory}
          onArchive={onArchiveContactHistory}
          onRestore={onRestoreContactHistory}
        />
        {canCreateEstimate ? (
          <div className="rounded-3xl border border-emerald-100 bg-emerald-50/70 p-4">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-950">Estimate draft</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">Start a draft estimate from this lead. Review pricing and scope before sending.</p>
                {!lead.customerId ? <p className="mt-2 text-xs font-bold text-amber-700">Link or convert this lead to a customer before creating the estimate.</p> : null}
              </div>
              <Button type="button" className="w-full sm:w-auto" onClick={() => onCreateEstimateFromLead(lead)} disabled={disabled || Boolean(lead.archivedAt) || !canManage}>
                Create Estimate
              </Button>
            </div>
          </div>
        ) : null}
        <InputField label="Project" value={lead.project} onChange={(event) => onFieldChange("project", event.target.value)} disabled={!canManage || disabled} />
        <div className="grid gap-3 md:grid-cols-3">
          <SelectField label="Status" value={lead.status} onChange={(event) => onFieldChange("status", event.target.value)} disabled={!canManage || disabled}>
            <option>New</option>
            <option>Contacted</option>
            <option>Site Visit</option>
            <option>Estimate Sent</option>
            <option>Approved</option>
            <option>Won</option>
            <option>Lost</option>
            <option>Not Interested</option>
          </SelectField>
          <SelectField label="Priority" value={lead.priority} onChange={(event) => onFieldChange("priority", event.target.value)} disabled={!canManage || disabled}>
            <option>Low</option>
            <option>Normal</option>
            <option>High</option>
          </SelectField>
          <SelectField label="Lead source" value={lead.source || "Call-in"} onChange={(event) => onFieldChange("source", event.target.value)} disabled={!canManage || disabled}>
            {LEAD_SOURCE_OPTIONS.map((source) => <option key={source} value={source}>{source === "public_request_form" ? "Public request form" : source}</option>)}
          </SelectField>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <SelectField label="Owner" value={lead.ownerId || ""} onChange={(event) => onFieldChange("ownerId", event.target.value)} disabled={!canManage || disabled}>
            <option value="">Unassigned</option>
            {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
          </SelectField>
          <InputField label="Follow-up due" type="date" value={lead.followUpDueAt || ""} onChange={(event) => onFieldChange("followUpDueAt", event.target.value)} disabled={!canManage || disabled} />
          <InputField label="Value" type="number" value={lead.value} onChange={(event) => onFieldChange("value", Number(event.target.value))} disabled={!canManage || disabled} />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <SelectField label="Linked customer" value={lead.customerId || ""} onChange={(event) => onFieldChange("customerId", event.target.value)} disabled={!canManage || disabled}>
            <option value="">Create or match automatically</option>
            {customers.filter((customer) => !customer.archivedAt).map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
          </SelectField>
          <InputField label="City" value={lead.city} onChange={(event) => onFieldChange("city", event.target.value)} disabled={!canManage || disabled} />
        </div>
        <InputField label="Next step" value={lead.nextStep} onChange={(event) => onFieldChange("nextStep", event.target.value)} disabled={!canManage || disabled} />
        <TextAreaField label="Notes" value={lead.notes} onChange={(event) => onFieldChange("notes", event.target.value)} disabled={!canManage || disabled} />
        <Card className="p-4">
          <SectionHeader title="Related customer" description="Keep the lead connected to the right customer record." />
          {related.customer ? (
            <button type="button" onClick={() => onSelectCustomer(related.customer.id)} className="w-full rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-left hover:bg-blue-50">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-black text-slate-950">{related.customer.name}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">{related.customer.city || "No city"} Ã‚Â· {related.customer.id}</p>
                </div>
                <StatusBadge status={related.customer.archivedAt ? "Archived" : related.customer.status} />
              </div>
            </button>
          ) : (
            <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50 p-4 text-sm text-slate-500">This lead is not linked to a customer record yet.</div>
          )}
        </Card>
        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="p-4">
            <SectionHeader title="Status history" description="Track how the opportunity moved through the pipeline." />
            <div className="space-y-3">
              {related.statusHistory.length === 0 ? <p className="text-sm text-slate-500">No status changes yet.</p> : related.statusHistory.slice(0, 6).map((entry) => (
                <div key={entry.id} className="rounded-2xl border border-blue-100 bg-white p-3">
                  <p className="text-sm font-black text-slate-950">{entry.fromStatus ? `${entry.fromStatus} -> ${entry.toStatus}` : entry.toStatus}</p>
                  <p className="mt-1 text-xs text-slate-500">{entry.note || "No note"}</p>
                  <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{formatDateTime(entry.createdAt)}</p>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-4">
            <SectionHeader title="Recent activity" description="Customer and lead activity tied to this opportunity." />
            <div className="space-y-3">
              {related.activity.length === 0 ? <p className="text-sm text-slate-500">No recent activity.</p> : related.activity.slice(0, 6).map((item) => (
                <div key={item.id} className="rounded-2xl border border-blue-100 bg-white p-3">
                  <p className="text-sm font-black text-slate-950">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.detail}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </Card>
  );
}
