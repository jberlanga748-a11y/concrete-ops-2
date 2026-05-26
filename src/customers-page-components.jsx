import { useEffect, useMemo, useState } from "react";

import { ApexMobileActionQueue, ApexMobileContactActionBar, ApexMobileKpiGrid, ApexMobileRoleShell, ApexOfficeCommandShell, Badge, Button, Card, InputField, SectionHeader, SelectField, StateCard, StatusBadge, TextAreaField } from "./app-shell-components";
import { ContactHistoryPanel } from "./contact-history-route-components";
import { CustomerFilterHeader, CustomerIntakeCard as ExtractedCustomerIntakeCard, RelatedRecordsCard as ExtractedRelatedRecordsCard } from "./customer-route-components";
import { deriveCustomerListState, relatedCustomerRecords } from "./customer-utils";
import { estimateDisplayCustomer } from "./estimate-display-utils";
import { jobNextStep, jobStatusLabel, jobTitle, normalizeJobStatus } from "./job-utils";
import { isLeadFollowUpDue } from "./lead-route-components";
import { normalizeObjectArray } from "./report-utils";

function useDesktopCommandViewport(minWidth = 1024) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return true;
    return window.matchMedia(`(min-width: ${minWidth}px)`).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
    const mediaQuery = window.matchMedia(`(min-width: ${minWidth}px)`);
    const update = () => setMatches(mediaQuery.matches);
    update();
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", update);
      return () => mediaQuery.removeEventListener("change", update);
    }
    mediaQuery.addListener(update);
    return () => mediaQuery.removeListener(update);
  }, [minWidth]);

  return matches;
}

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

function SaveStateText({ saveState, align = "left" }) {
  const palette = {
    idle: "text-slate-400",
    pending: "text-amber-600",
    saving: "text-blue-700",
    saved: "text-emerald-700",
    error: "text-red-700",
  };

  return (
    <p className={`text-xs font-black uppercase tracking-[0.14em] ${palette[saveState.status] || palette.idle} ${align === "right" ? "text-right" : ""}`}>
      {saveState.message}
    </p>
  );
}

function TimestampMeta({ createdAt, updatedAt }) {
  return (
    <div className="grid gap-2 rounded-2xl border border-blue-100 bg-blue-50/60 p-3 text-xs text-slate-600 md:grid-cols-2">
      <div>
        <p className="font-black uppercase tracking-[0.14em] text-slate-400">Created</p>
        <p className="mt-1 font-bold text-slate-700">{formatDateTime(createdAt)}</p>
      </div>
      <div>
        <p className="font-black uppercase tracking-[0.14em] text-slate-400">Last updated</p>
        <p className="mt-1 font-bold text-slate-700">{formatDateTime(updatedAt)}</p>
      </div>
    </div>
  );
}

function customerStatusText(customer) {
  return customer?.archivedAt ? "Archived" : (customer?.status || "Prospect");
}

function customerContactText(customer) {
  return [customer?.phone, customer?.email].filter(Boolean).join(" / ") || "No contact set";
}

function CustomerDetailPanel({
  customer,
  canView,
  canManage,
  notFound,
  disabled,
  saveState,
  onFieldChange,
  onArchive,
  onRestore,
  related,
  onSelectLead,
  onSelectJob,
  contactHistory = [],
  contactHistoryPermissions,
  onCreateContactHistory,
  onUpdateContactHistory,
  onArchiveContactHistory,
  onRestoreContactHistory,
}) {
  if (!canView) {
    return (
      <Card className="p-5">
        <SectionHeader title="Customer details" description="Customer access follows role permissions." />
        <StateCard title="Customer access unavailable" description="This role cannot open the customer workspace right now." tone="slate" />
      </Card>
    );
  }

  if (notFound) {
    return (
      <Card className="p-5">
        <SectionHeader title="Customer details" description="The requested customer route does not match an available record." />
        <StateCard title="Customer not found" description="The customer may have been archived, removed from your access scope, or never existed." tone="red" />
      </Card>
    );
  }

  if (!customer) {
    return (
      <Card className="p-5">
        <SectionHeader title="Customer details" description="Select a customer to view contact details and linked work." />
        <StateCard title="No customer selected" description="Pick a customer from the list to inspect their activity, leads, and jobs." tone="slate" />
      </Card>
    );
  }

  return (
    <div className="min-w-0 space-y-4">
      <Card className="p-5">
        <SectionHeader
          title={customer.name}
          description={`${customer.id} · ${customer.city || customer.serviceArea || "No service area yet"}`}
          action={
            <div className="flex flex-wrap gap-2">
              {!canManage ? <Badge tone="slate">Read only</Badge> : null}
              {customer.archivedAt ? <Badge tone="slate">Archived</Badge> : null}
              {canManage ? (
                customer.archivedAt ? (
                  <Button variant="secondary" size="sm" onClick={onRestore} disabled={disabled}>Restore</Button>
                ) : (
                  <Button variant="secondary" size="sm" onClick={onArchive} disabled={disabled}>Archive</Button>
                )
              ) : null}
            </div>
          }
        />
        <SaveStateText saveState={saveState} />
        <div className="grid gap-3">
          <TimestampMeta createdAt={customer.createdAt} updatedAt={customer.updatedAt} />
          <div className="grid gap-3 md:grid-cols-2">
            <InputField label="Customer name" value={customer.name} onChange={(event) => onFieldChange("name", event.target.value)} disabled={!canManage || disabled} />
            <InputField label="Company" value={customer.company} onChange={(event) => onFieldChange("company", event.target.value)} disabled={!canManage || disabled} />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <InputField label="Phone" value={customer.phone} onChange={(event) => onFieldChange("phone", event.target.value)} disabled={!canManage || disabled} />
            <InputField label="Email" value={customer.email} onChange={(event) => onFieldChange("email", event.target.value)} disabled={!canManage || disabled} />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <InputField label="City" value={customer.city} onChange={(event) => onFieldChange("city", event.target.value)} disabled={!canManage || disabled} />
            <InputField label="Service area" value={customer.serviceArea} onChange={(event) => onFieldChange("serviceArea", event.target.value)} disabled={!canManage || disabled} />
            <SelectField label="Status" value={customer.status} onChange={(event) => onFieldChange("status", event.target.value)} disabled={!canManage || disabled}>
              <option>Prospect</option>
              <option>Active</option>
              <option>Inactive</option>
            </SelectField>
          </div>
          <TextAreaField label="Notes" value={customer.notes} onChange={(event) => onFieldChange("notes", event.target.value)} disabled={!canManage || disabled} />
        </div>
      </Card>

      <ContactHistoryPanel
        entityType="customer"
        entity={customer}
        records={contactHistory}
        permissions={contactHistoryPermissions}
        disabled={disabled}
        onCreate={onCreateContactHistory}
        onUpdate={onUpdateContactHistory}
        onArchive={onArchiveContactHistory}
        onRestore={onRestoreContactHistory}
      />

      <ExtractedRelatedRecordsCard
        title="Related leads"
        description="Open opportunities connected to this customer."
        emptyLabel="No linked leads"
        items={related.leads}
        renderItem={(lead) => (
          <button key={lead.id} type="button" onClick={() => onSelectLead(lead.id)} className="w-full rounded-2xl border border-blue-100 bg-white p-4 text-left hover:bg-blue-50/60">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black text-slate-950">{lead.project}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">{lead.id} · {lead.city}</p>
              </div>
              <StatusBadge status={lead.status} />
            </div>
          </button>
        )}
      />

      <ExtractedRelatedRecordsCard
        title="Related jobs"
        description="Scheduled or active work linked to this customer."
        emptyLabel="No linked jobs"
        items={related.jobs}
        renderItem={(job) => (
          <button key={job.id} type="button" onClick={() => onSelectJob(job.id)} className="w-full rounded-2xl border border-blue-100 bg-white p-4 text-left hover:bg-blue-50/60">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black text-slate-950">{jobTitle(job)}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">{job.id} · {jobNextStep(job)}</p>
              </div>
              <StatusBadge status={jobStatusLabel(job.status || job.stage)} />
            </div>
          </button>
        )}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <ExtractedRelatedRecordsCard
          title="Estimates"
          description="Estimate records will appear here once that module is built."
          emptyLabel="No linked estimates"
          items={[]}
          renderItem={() => null}
        />
        <ExtractedRelatedRecordsCard
          title="Change orders"
          description="Approved scope changes will appear here when available."
          emptyLabel="No linked change orders"
          items={[]}
          renderItem={() => null}
        />
      </div>

      <ExtractedRelatedRecordsCard
        title="Activity"
        description="Recent activity mentioning this customer."
        emptyLabel="No customer activity yet"
        items={related.activity.slice(0, 5)}
        renderItem={(item) => (
          <div key={item.id} className="rounded-2xl border border-blue-100 bg-white p-4">
            <p className="text-sm font-black text-slate-950">{item.title}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">{item.detail}</p>
            <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{formatDateTime(item.createdAt)}</p>
          </div>
        )}
      />
    </div>
  );
}

function customerEstimateRecords(customer, estimates = []) {
  if (!customer) return [];
  const normalizedName = String(customer.name || "").toLowerCase();
  return normalizeObjectArray(estimates).filter((estimate) => {
    const values = [
      estimate.customerId,
      estimate.customer?.id,
      estimate.customerName,
      estimate.customer,
      estimateDisplayCustomer?.(estimate),
    ].map((value) => String(value || "").toLowerCase());
    return values.includes(String(customer.id || "").toLowerCase()) || values.includes(normalizedName);
  });
}

function customerOperationsSummary(customer, { leads = [], jobs = [], activity = [], estimates = [] } = {}) {
  const related = relatedCustomerRecords(customer, leads, jobs, activity);
  const activeJobs = related.jobs.filter((job) => ["in_progress", "scheduled", "planned"].includes(normalizeJobStatus(job.status || job.stage)));
  const readyJobs = related.jobs.filter((job) => normalizeJobStatus(job.status || job.stage) === "billing_ready");
  const customerEstimates = customerEstimateRecords(customer, estimates);
  const openLeads = related.leads.filter((lead) => !lead.archivedAt && !["won", "lost", "closed"].includes(String(lead.status || "").toLowerCase()));
  const dueLeads = related.leads.filter((lead) => isLeadFollowUpDue(lead));
  const contactGap = Boolean(customer && (!customer.phone || !customer.email));
  const tone = contactGap || dueLeads.length ? "amber" : activeJobs.length || readyJobs.length ? "green" : openLeads.length || customerEstimates.length ? "orange" : "slate";
  const nextAction = contactGap
    ? "Fill contact gap"
    : dueLeads.length
      ? "Follow up lead"
      : readyJobs.length
        ? "Review ready work"
        : activeJobs.length
          ? "Check active job"
          : customerEstimates.length
            ? "Review estimate"
            : "Keep account ready";

  return {
    related,
    activeJobs,
    readyJobs,
    estimates: customerEstimates,
    openLeads,
    dueLeads,
    contactGap,
    tone,
    nextAction,
  };
}

function CustomerMobileSelectedCard({
  customer,
  summary,
  canManage,
  disabled,
  saveState,
  onOpenEdit,
  onCreateCustomer,
  onOpenLead,
  onOpenJob,
}) {
  const primaryJob = summary?.activeJobs?.[0] || summary?.related?.jobs?.[0] || null;
  const primaryLead = summary?.openLeads?.[0] || summary?.related?.leads?.[0] || null;

  if (!customer) {
    return (
      <section className="co-apex-mobile-selected-card co-customers-mobile-selected-card">
        <div className="co-apex-mobile-selected-head">
          <span>Selected account</span>
          <Badge tone="slate">None</Badge>
        </div>
        <h2>No customer selected</h2>
        <p>Create or choose an account to review contact readiness and linked work.</p>
        {canManage ? (
          <div className="co-apex-mobile-selected-actions">
            <Button type="button" onClick={onCreateCustomer}>New Customer</Button>
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <section className="co-apex-mobile-selected-card co-customers-mobile-selected-card">
      <div className="co-apex-mobile-selected-head">
        <span>Selected account</span>
        <StatusBadge status={customerStatusText(customer)} />
      </div>
      <h2>{customer.name || "Unnamed customer"}</h2>
      <p>{[customer.company, customer.city, customer.serviceArea].filter(Boolean).join(" / ") || customer.id}</p>
      <div className="co-apex-mobile-selected-summary">
        <span>
          <em>Contact</em>
          <strong>{customerContactText(customer)}</strong>
        </span>
        <span>
          <em>Next action</em>
          <strong>{summary?.nextAction || "Keep account details ready"}</strong>
        </span>
      </div>
      <ApexMobileContactActionBar
        phone={customer.phone}
        email={customer.email}
        subject={`Apex HQ follow-up: ${customer.name || "customer account"}`}
        textDraft={`Hi ${customer.name || "there"}, this is a quick follow-up from Apex HQ.`}
        emailBody={`Hi ${customer.name || "there"},\n\nFollowing up on your account details.\n\nThanks,`}
        onOpenContact={onOpenEdit}
      />
      <div className="co-apex-mobile-selected-actions">
        <Button type="button" variant="secondary" onClick={() => onOpenJob?.(primaryJob?.id)} disabled={!primaryJob}>
          Open Job
        </Button>
        <Button type="button" variant="secondary" onClick={() => onOpenLead?.(primaryLead?.id)} disabled={!primaryLead}>
          Open Lead
        </Button>
      </div>
      {saveState?.status && saveState.status !== "idle" ? (
        <p className="co-apex-mobile-guardrail">{saveState.message}</p>
      ) : null}
    </section>
  );
}

function CustomerMobileEditPanel({
  customer,
  canManage,
  disabled,
  saveState,
  onFieldChange,
  onArchive,
  onRestore,
}) {
  if (!customer) return <StateCard title="No customer selected" description="Choose an account before editing contact details." tone="slate" />;

  return (
    <div className="co-customers-mobile-edit-panel">
      <SaveStateText saveState={saveState} />
      <div className="co-customers-mobile-edit-grid">
        <InputField label="Customer name" value={customer.name || ""} onChange={(event) => onFieldChange("name", event.target.value)} disabled={!canManage || disabled} />
        <InputField label="Phone" value={customer.phone || ""} onChange={(event) => onFieldChange("phone", event.target.value)} disabled={!canManage || disabled} />
        <InputField label="Email" value={customer.email || ""} onChange={(event) => onFieldChange("email", event.target.value)} disabled={!canManage || disabled} />
        <InputField label="City" value={customer.city || ""} onChange={(event) => onFieldChange("city", event.target.value)} disabled={!canManage || disabled} />
        <SelectField label="Status" value={customer.status || "Prospect"} onChange={(event) => onFieldChange("status", event.target.value)} disabled={!canManage || disabled}>
          <option>Prospect</option>
          <option>Active</option>
          <option>Inactive</option>
        </SelectField>
        <TextAreaField label="Notes" value={customer.notes || ""} onChange={(event) => onFieldChange("notes", event.target.value)} disabled={!canManage || disabled} />
      </div>
      {canManage ? (
        <div className="co-apex-mobile-selected-actions">
          {customer.archivedAt ? (
            <Button type="button" variant="secondary" onClick={onRestore} disabled={disabled}>Restore</Button>
          ) : (
            <Button type="button" variant="secondary" onClick={onArchive} disabled={disabled}>Archive</Button>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function CustomersPage({
  ...props
}) {
  return <CustomersPagePolished {...props} />;
}

function CustomersPagePolished({
  customers,
  contactHistory = [],
  leads = [],
  jobs = [],
  activity = [],
  estimates = [],
  filter,
  setFilter,
  search,
  setSearch,
  selectedCustomerId,
  onSelectCustomer,
  selectedCustomer,
  onCustomerFieldChange,
  customerDraft,
  setCustomerDraft,
  onCreateCustomer,
  onArchiveCustomer,
  onRestoreCustomer,
  busy,
  customerSaveState,
  permissions,
  errorMessage,
  relatedRecords,
  onSelectLead,
  onSelectJob,
  onCreateContactHistory,
  onUpdateContactHistory,
  onArchiveContactHistory,
  onRestoreContactHistory,
  customerRouteRequested,
}) {
  const canView = permissions.customers.canView;
  const canManage = permissions.customers.canManage;
  const canUseCustomersCommandShell = useDesktopCommandViewport(768);
  const [showCreateCustomer, setShowCreateCustomer] = useState(false);
  const [showMobileEdit, setShowMobileEdit] = useState(false);
  const debugState = useMemo(() => deriveCustomerListState(customers, {
    status: filter,
    query: search,
  }), [customers, filter, search]);
  const visibleRows = debugState.renderedRows;
  const activeVisibleRows = visibleRows.filter((customer) => !customer.archivedAt);
  const missingContactRows = activeVisibleRows.filter((customer) => !customer.phone || !customer.email);
  const totalCustomers = customers.length;
  const customerWorkspaceKpis = [
    { label: "Visible customers", value: canView ? visibleRows.length : 0, helper: "Accounts in the current board", icon: "users", tone: "blue", actionLabel: "View all", onAction: () => setFilter("All") },
    { label: "Active accounts", value: activeVisibleRows.length, helper: "Not archived and ready for work", icon: "briefcase", tone: "green", actionLabel: "Active", onAction: () => setFilter("Active") },
    { label: "Contact gaps", value: missingContactRows.length, helper: "Phone or email needs cleanup", icon: "alert", tone: missingContactRows.length ? "amber" : "green", actionLabel: "Review gaps", onAction: () => setFilter("All") },
    { label: "Linked workflow", value: leads.length + jobs.length + estimates.length, helper: "Leads, jobs, and estimates in context", icon: "layers", tone: "orange", actionLabel: "Scan board", onAction: () => setFilter("All") },
  ];
  const customerShellKpis = customerWorkspaceKpis.map(({ onAction, actionLabel, ...item }) => ({
    ...item,
    onClick: onAction,
  }));
  const customerShellQueue = useMemo(() => {
    const customerItems = visibleRows.map((customer) => {
      const linked = relatedCustomerRecords(customer, leads, jobs, activity);
      const hasContactGap = !customer.phone || !customer.email;
      const hasActiveWork = linked.jobs.some((job) => !job.archivedAt && ["scheduled", "in_progress", "planned"].includes(normalizeJobStatus(job.status || job.stage)));
      const hasPipeline = linked.leads.some((lead) => !lead.archivedAt);
      const priorityScore = hasContactGap ? 50 : hasActiveWork ? 40 : hasPipeline ? 30 : customer.status === "Prospect" ? 20 : 10;
      const statusLabel = customer.archivedAt ? "Archived" : hasContactGap ? "Contact Gap" : hasActiveWork ? "Active Work" : hasPipeline ? "Pipeline" : customer.status || "Customer";
      const tone = customer.archivedAt ? "slate" : hasContactGap ? "amber" : hasActiveWork ? "orange" : hasPipeline ? "blue" : customer.status === "Active" ? "green" : "slate";

      return {
        id: `customer:${customer.id}`,
        kind: "customer",
        customer,
        linked,
        title: customer.name || "Unnamed customer",
        meta: [customer.company, customer.city, customer.serviceArea].filter(Boolean).join(" / ") || customerContactText(customer),
        sourceLabel: customer.status || "Customer",
        status: statusLabel,
        statusLabel,
        tone,
        actionLabel: canManage ? "Review" : "View",
        priorityScore,
        badges: [
          { label: customer.status || "Customer", tone: customer.archivedAt ? "slate" : tone },
          { label: `${linked.jobs.length} jobs`, tone: linked.jobs.length ? "orange" : "slate" },
          { label: `${linked.leads.length} leads`, tone: linked.leads.length ? "blue" : "slate" },
        ],
      };
    }).sort((left, right) => (
      right.priorityScore - left.priorityScore ||
      left.title.localeCompare(right.title)
    ));

    return [
      canManage ? {
        id: "create-customer",
        kind: "create",
        title: "New customer",
        meta: "Create contact and service-area details",
        sourceLabel: "Create",
        status: "Manual Entry",
        statusLabel: "Manual Entry",
        tone: "blue",
        actionLabel: "Create",
      } : null,
      ...customerItems,
    ].filter(Boolean);
  }, [activity, canManage, jobs, leads, visibleRows]);
  const selectedCustomerShellItem = useMemo(() => {
    if (showCreateCustomer) return customerShellQueue.find((item) => item.kind === "create") || null;
    return customerShellQueue.find((item) => item.kind === "customer" && item.customer?.id === selectedCustomerId)
      || customerShellQueue.find((item) => item.kind === "customer")
      || customerShellQueue[0]
      || null;
  }, [customerShellQueue, selectedCustomerId, showCreateCustomer]);
  const mobileCustomerItems = useMemo(() => customerShellQueue.filter((item) => item.kind === "customer").slice(0, 3), [customerShellQueue]);
  const mobileFocusItem = selectedCustomerShellItem?.kind === "customer" ? selectedCustomerShellItem : (mobileCustomerItems[0] || null);
  const mobileFocusCustomer = mobileFocusItem?.customer?.id === selectedCustomer?.id
    ? selectedCustomer
    : (mobileFocusItem?.customer || selectedCustomer || visibleRows[0] || null);
  const mobileFocusSummary = useMemo(() => (
    mobileFocusCustomer ? customerOperationsSummary(mobileFocusCustomer, { leads, jobs, activity, estimates }) : null
  ), [activity, estimates, jobs, leads, mobileFocusCustomer]);
  const mobileCustomerKpis = useMemo(() => (
    customerShellKpis.filter((item) => ["Visible customers", "Contact gaps"].includes(item.label))
  ), [customerShellKpis]);

  useEffect(() => {
    if (!canUseCustomersCommandShell || showCreateCustomer || !selectedCustomerId) return;
    const selectedIsVisible = customerShellQueue.some((item) => item.kind === "customer" && item.customer?.id === selectedCustomerId);
    if (selectedIsVisible) return;
    const nextCustomerItem = customerShellQueue.find((item) => item.kind === "customer");
    if (nextCustomerItem?.customer?.id) onSelectCustomer(nextCustomerItem.customer.id);
  }, [canUseCustomersCommandShell, customerShellQueue, onSelectCustomer, selectedCustomerId, showCreateCustomer]);

  function selectCustomerShellItem(item) {
    if (!item) return;
    if (item.kind === "create") {
      setShowCreateCustomer(true);
      return;
    }
    setShowCreateCustomer(false);
    if (item.customer?.id) onSelectCustomer(item.customer.id);
  }

  function openFirstCustomerShellItem(predicate) {
    const nextItem = customerShellQueue.find(predicate);
    if (nextItem) selectCustomerShellItem(nextItem);
  }

  function renderCustomerShellDetail(item) {
    if (item?.kind === "create") {
      return (
        <div className="co-customers-shell-detail-scroll">
          <ExtractedCustomerIntakeCard draft={customerDraft} setDraft={setCustomerDraft} onCreateCustomer={onCreateCustomer} disabled={busy} canManage={canManage} />
        </div>
      );
    }

    const detailCustomer = item?.customer?.id === selectedCustomer?.id ? selectedCustomer : (item?.customer || selectedCustomer);
    const detailRelated = detailCustomer?.id === selectedCustomer?.id ? relatedRecords : relatedCustomerRecords(detailCustomer, leads, jobs, activity);

    return (
      <div className="co-customers-shell-detail-scroll">
        <CustomerDetailPanel
          customer={detailCustomer}
          canView={canView}
          canManage={canManage}
          notFound={canView && customerRouteRequested && !detailCustomer}
          disabled={busy}
          saveState={customerSaveState}
          onFieldChange={onCustomerFieldChange}
          onArchive={onArchiveCustomer}
          onRestore={onRestoreCustomer}
          related={detailRelated}
          onSelectLead={onSelectLead}
          onSelectJob={onSelectJob}
          contactHistory={contactHistory}
          contactHistoryPermissions={permissions.contactHistory}
          onCreateContactHistory={onCreateContactHistory}
          onUpdateContactHistory={onUpdateContactHistory}
          onArchiveContactHistory={onArchiveContactHistory}
          onRestoreContactHistory={onRestoreContactHistory}
        />
      </div>
    );
  }

  if (canUseCustomersCommandShell) {
    return (
      <div className="co-office-page co-customers-page co-customers-shell-page">
        <ApexOfficeCommandShell
          eyebrow="Office"
          title="Customers"
          description="Track customer relationships, contact gaps, linked leads, jobs, and follow-up history from one contractor command view."
          kpis={customerShellKpis}
          queue={{
            title: "Customer queue",
            description: `${customerShellQueue.filter((item) => item.kind === "customer").length} visible customer account${customerShellQueue.filter((item) => item.kind === "customer").length === 1 ? "" : "s"} from the current filters.`,
            items: customerShellQueue,
            selectedId: selectedCustomerShellItem?.id,
            onSelect: selectCustomerShellItem,
            controls: canView ? (
              <CustomerFilterHeader
                filters={["All", "Prospect", "Active", "Inactive", "Archived"]}
                active={filter}
                setActive={(nextFilter) => {
                  setShowCreateCustomer(false);
                  setFilter(nextFilter);
                }}
                search={search}
                setSearch={(nextSearch) => {
                  setShowCreateCustomer(false);
                  setSearch(nextSearch);
                }}
                placeholder="Search customers..."
              />
            ) : null,
            emptyState: <StateCard title="No customers available" description="Create the first customer record to start linking leads and jobs." tone="slate" />,
          }}
          detail={{
            title: selectedCustomerShellItem?.kind === "create" ? "New customer" : "Selected customer",
            item: selectedCustomerShellItem,
            render: renderCustomerShellDetail,
            emptyState: <StateCard title="No customer selected" description="Select a customer from the queue to review contact details, linked work, and history." tone="slate" />,
          }}
          quickActions={[
            canManage ? { id: "new-customer", label: "New Customer", icon: "plus", onClick: () => openFirstCustomerShellItem((item) => item.kind === "create") } : null,
            { id: "contact-gaps", label: "Contact Gaps", icon: "alert", onClick: () => openFirstCustomerShellItem((item) => item.kind === "customer" && item.statusLabel === "Contact Gap"), disabled: !missingContactRows.length },
            { id: "active-customers", label: "Active", icon: "users", onClick: () => { setFilter("Active"); setSearch(""); } },
          ].filter(Boolean)}
          className="co-customers-command-shell"
        />
      </div>
    );
  }

  return (
    <ApexMobileRoleShell
      eyebrow="Office"
      title="Contacts"
      description="Review the selected account, make a manual contact draft, and keep the top customer priorities close."
      className="co-customers-page co-customers-mobile-compact"
    >
      {canView ? (
        <>
          <CustomerMobileSelectedCard
            customer={mobileFocusCustomer}
            summary={mobileFocusSummary}
            canManage={canManage}
            disabled={busy}
            saveState={customerSaveState}
            onOpenEdit={() => setShowMobileEdit(true)}
            onCreateCustomer={() => setShowCreateCustomer(true)}
            onOpenLead={onSelectLead}
            onOpenJob={onSelectJob}
          />
          <ApexMobileActionQueue
            title="Top accounts"
            items={mobileCustomerItems}
            selectedId={mobileFocusItem?.id}
            onSelect={(item) => {
              setShowCreateCustomer(false);
              setShowMobileEdit(false);
              selectCustomerShellItem(item);
            }}
          />
          <div className="co-customers-mobile-filter-strip" aria-label="Customer filters">
            <button type="button" className={filter === "All" && !search ? "is-active" : ""} onClick={() => { setFilter("All"); setSearch(""); }}>All</button>
            <button type="button" className={filter === "Active" ? "is-active" : ""} onClick={() => { setFilter("Active"); setSearch(""); }}>Active</button>
            <button
              type="button"
              className={missingContactRows.length ? "" : "is-muted"}
              onClick={() => {
                setFilter("All");
                setSearch("");
                setShowCreateCustomer(false);
                setShowMobileEdit(false);
                if (missingContactRows[0]?.id) onSelectCustomer(missingContactRows[0].id);
              }}
            >
              Gaps
            </button>
          </div>
          <ApexMobileKpiGrid items={mobileCustomerKpis} />
          {canManage ? (
            <details className="co-customers-mobile-drawer" open={showCreateCustomer} onToggle={(event) => setShowCreateCustomer(event.currentTarget.open)}>
              <summary>
                <span>New customer</span>
                <strong>{showCreateCustomer ? "Close" : "Open"}</strong>
              </summary>
              <ExtractedCustomerIntakeCard draft={customerDraft} setDraft={setCustomerDraft} onCreateCustomer={onCreateCustomer} disabled={busy} canManage={canManage} />
            </details>
          ) : null}
          <details className="co-customers-mobile-drawer" open={showMobileEdit} onToggle={(event) => setShowMobileEdit(event.currentTarget.open)}>
            <summary>
              <span>Edit selected contact</span>
              <strong>{showMobileEdit ? "Close" : "Open"}</strong>
            </summary>
            <CustomerMobileEditPanel
              customer={mobileFocusCustomer}
              canManage={canManage}
              disabled={busy}
              saveState={customerSaveState}
              onFieldChange={onCustomerFieldChange}
              onArchive={onArchiveCustomer}
              onRestore={onRestoreCustomer}
            />
          </details>
        </>
      ) : (
        <StateCard title="Customer access unavailable" description="This role cannot open the customer workspace until customer-specific assignments exist." tone="slate" />
      )}
    </ApexMobileRoleShell>
  );

}
