import { getCustomerFilterLayoutClasses } from "./customer-filter-layout";
import {
  Badge,
  Button,
  Card,
  Icon,
  InputField,
  SectionHeader,
  SelectField,
  StateCard,
  StatusBadge,
  TextAreaField,
} from "./app-shell-components";

export function CustomerFilterHeader({ filters, active, setActive, search, setSearch, placeholder = "Search..." }) {
  const layout = getCustomerFilterLayoutClasses();

  return (
    <div className={`co-filter-bar co-customer-filter-bar ${layout.header}`}>
      <div className={layout.pillsRow}>
        {filters.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setActive(filter)}
            className={`rounded-lg px-3 py-2 text-xs font-black ${active === filter ? "bg-blue-700 text-white shadow-sm shadow-blue-700/20" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-orange-50 hover:text-orange-700 hover:ring-orange-200"}`}
          >
            {filter}
          </button>
        ))}
      </div>
      <div className={layout.searchRow}>
        <input className={layout.searchInput} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={placeholder} />
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

export function CustomersTablePolished({ rows, selectedId, onSelect }) {
  return (
    <>
      <div className="co-customers-mobile-list grid gap-3 p-3 md:hidden">
        {rows.map((customer) => {
          const selected = customer.id === selectedId;
          return (
            <button
              key={customer.id}
              type="button"
              onClick={() => onSelect(customer.id)}
              className={`co-customers-mobile-card co-mobile-record-card co-office-list-card w-full rounded-[1.15rem] border p-4 text-left transition ${selected ? "is-selected border-orange-200 bg-orange-50/70" : "border-slate-200 bg-white hover:border-orange-200 hover:bg-orange-50/30"}`}
            >
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words text-base font-black text-slate-950">{customer.name || "Unnamed customer"}</p>
                  <p className="mt-1 break-words text-xs font-bold text-slate-500">{customer.company || customer.id}</p>
                </div>
                <StatusBadge status={customerStatusText(customer)} />
              </div>
              <div className="mt-4 grid gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Contact</p>
                  <p className="mt-1 break-words text-sm font-bold text-slate-700">{customerContactText(customer)}</p>
                </div>
                <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">City</p>
                    <p className="mt-1 break-words text-sm font-bold text-slate-700">{customer.city || "Not set"}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Service area</p>
                    <p className="mt-1 break-words text-sm font-bold text-slate-700">{customer.serviceArea || "Not set"}</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between gap-2">
                {selected ? <Badge tone="blue">Selected</Badge> : <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Review</span>}
                <span className="co-leads-row-action">
                  Open
                  <Icon name="arrowUpRight" />
                </span>
              </div>
            </button>
          );
        })}
      </div>
      <div className="hidden md:block">
        <div className="table-shell">
          <table className="co-customers-command-table w-full min-w-[740px] text-left">
            <thead>
              <tr>
                <th>Customer / Company</th>
                <th>Status</th>
                <th>Contact</th>
                <th>City</th>
                <th>Service Area</th>
                <th>Notes</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((customer) => {
                const selected = customer.id === selectedId;
                return (
                  <tr key={customer.id} onClick={() => onSelect(customer.id)} className={`cursor-pointer transition hover:bg-orange-50/45 ${selected ? "bg-orange-50/70" : ""}`}>
                    <td>
                      <p className="font-black text-slate-950">{customer.name || "Unnamed customer"}</p>
                      <p className="text-xs font-bold text-slate-500">{customer.company || customer.id}</p>
                    </td>
                    <td><StatusBadge status={customerStatusText(customer)} /></td>
                    <td>
                      <p className="font-bold text-slate-700">{customer.phone || "Phone not set"}</p>
                      <p className="text-xs font-bold text-slate-500">{customer.email || "Email not set"}</p>
                    </td>
                    <td className="font-bold text-slate-700">{customer.city || "Not set"}</td>
                    <td className="font-bold text-slate-700"><span className="line-clamp-2">{customer.serviceArea || "Not set"}</span></td>
                    <td className="text-slate-600"><span className="line-clamp-2">{customer.notes || "No notes yet"}</span></td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <button type="button" className="co-leads-icon-button" onClick={(event) => { event.stopPropagation(); onSelect(customer.id); }} aria-label={`Review ${customer.name || "customer"}`}>
                          <Icon name="document" />
                        </button>
                        <button type="button" className="co-leads-icon-button" onClick={(event) => { event.stopPropagation(); onSelect(customer.id); }} aria-label={`Open ${customer.name || "customer"}`}>
                          <Icon name="arrowUpRight" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export function CustomerIntakeCard({ draft, setDraft, onCreateCustomer, disabled, canManage }) {
  if (!canManage) {
    return (
      <Card className="p-5">
        <SectionHeader title="New customer" description="Customer creation is restricted to owner/admin roles." />
        <StateCard title="Read-only access" description="You can review linked customers here, but only office leadership can create or update them." tone="slate" />
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <SectionHeader title="New customer" description="Create a durable customer record with contact and service-area details." />
      <form className="grid gap-3" onSubmit={onCreateCustomer}>
        <div className="grid gap-3 md:grid-cols-2">
          <InputField label="Customer name" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Dana Martinez" />
          <InputField label="Company" value={draft.company} onChange={(event) => setDraft((current) => ({ ...current, company: event.target.value }))} placeholder="Optional" />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <InputField label="Phone" value={draft.phone} onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))} placeholder="503-555-0199" />
          <InputField label="Email" type="email" value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} placeholder="dana@example.com" />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <InputField label="City" value={draft.city} onChange={(event) => setDraft((current) => ({ ...current, city: event.target.value }))} placeholder="Salem" />
          <InputField label="Service area" value={draft.serviceArea} onChange={(event) => setDraft((current) => ({ ...current, serviceArea: event.target.value }))} placeholder="Mid-Valley" />
          <SelectField label="Status" value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}>
            <option>Prospect</option>
            <option>Active</option>
            <option>Inactive</option>
          </SelectField>
        </div>
        <TextAreaField label="Notes" value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Preferred finish, scheduling constraints, gate access..." />
        <Button type="submit" disabled={disabled}>
          <Icon name="plus" />
          Add customer
        </Button>
      </form>
    </Card>
  );
}
