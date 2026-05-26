import { useEffect, useMemo, useRef, useState } from "react";

import {
  ApexOfficeCommandShell,
  AssistantRail,
  Badge,
  Button,
  Card,
  CommandPageFrame,
  DesktopCommandWorkspaceFrame,
  FilterBar,
  Icon,
  InputField,
  PageHeader,
  SectionHeader,
  SelectField,
  StateCard,
  WorkQueueCard,
} from "./app-shell-components";
import { CommandCenterKpiCard, ModuleKpiStrip } from "./command-center-route-components";
import { jobTitle, normalizeJobStatus } from "./job-utils";
import { todayWorkCrewAssignments, todayWorkForemanLabel } from "./report-utils";
import { deriveUserListState, USER_ROLE_OPTIONS } from "./user-utils";

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

function normalizeObjectArray(value, fallback = []) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return Object.values(value);
  return fallback;
}

function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function TimestampMeta({ createdAt, updatedAt }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3 text-sm text-slate-500">
        <span className="text-[11px] font-black uppercase tracking-widest">Created</span>
        <p className="mt-1 font-bold text-slate-700">{formatDateTime(createdAt)}</p>
      </div>
      <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3 text-sm text-slate-500">
        <span className="text-[11px] font-black uppercase tracking-widest">Updated</span>
        <p className="mt-1 font-bold text-slate-700">{formatDateTime(updatedAt)}</p>
      </div>
    </div>
  );
}

function UserStatusBadge({ status }) {
  return <Badge tone={status === "active" ? "green" : "slate"}>{status === "active" ? "Active" : "Inactive"}</Badge>;
}

function UsersTable({ rows, selectedId, onSelect }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-left">
        <thead className="border-b border-blue-100 bg-slate-50 text-[11px] font-black uppercase tracking-widest text-slate-500">
          <tr>
            <th className="px-4 py-3">User</th>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Phone</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Last login</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-blue-50">
          {rows.map((user) => {
            const selected = user.id === selectedId;
            return (
              <tr key={user.id} onClick={() => onSelect(user.id)} className={`cursor-pointer transition hover:bg-blue-50/60 ${selected ? "bg-blue-50/80" : ""}`}>
                <td className="px-4 py-3">
                  <p className="font-black text-slate-950">{user.name}</p>
                  <p className="text-xs font-bold text-slate-500">{user.email}</p>
                </td>
                <td className="px-4 py-3 text-sm font-bold text-slate-700">{user.role}</td>
                <td className="px-4 py-3 text-sm font-bold text-slate-500">{user.phone || "Not set"}</td>
                <td className="px-4 py-3"><UserStatusBadge status={user.status} /></td>
                <td className="px-4 py-3 text-sm font-bold text-slate-500">{user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Never"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function UserCreateCard({ draft, setDraft, onCreateUser, disabled, provisionedNotice }) {
  const activationCopyValue = provisionedNotice?.activationUrl
    ? `${typeof window !== "undefined" ? window.location.origin : ""}${provisionedNotice.activationUrl}`
    : provisionedNotice?.temporaryPassword || "";
  return (
    <Card className="p-5">
      <SectionHeader title="Create user" description="Create a login for office, foreman, or employee access." />
      {provisionedNotice ? (
        <div className="mb-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800">
          <p className="font-black text-emerald-900">{provisionedNotice.activationToken ? "Activation invite ready" : "Temporary password ready"}</p>
          <p className="mt-1">{provisionedNotice.email}</p>
          <p className="mt-2 break-all font-mono text-xs">{activationCopyValue}</p>
        </div>
      ) : null}
      <form className="grid gap-3" onSubmit={onCreateUser}>
        <div className="grid gap-3 md:grid-cols-2">
          <InputField label="Full name" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
          <InputField label="Email" type="email" value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <InputField label="Phone" value={draft.phone} onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))} />
          <SelectField label="Role" value={draft.role} onChange={(event) => setDraft((current) => ({ ...current, role: event.target.value }))}>
            {USER_ROLE_OPTIONS.map((role) => <option key={role} value={role}>{role}</option>)}
          </SelectField>
          <SelectField label="Status" value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </SelectField>
        </div>
        <InputField label="Password" type="text" value={draft.password} onChange={(event) => setDraft((current) => ({ ...current, password: event.target.value }))} placeholder="Leave blank to create an activation invite" />
        <Button type="submit" disabled={disabled}>
          <Icon name="plus" />
          Add user
        </Button>
      </form>
    </Card>
  );
}

function UserDetailPanel({ user, draft, setDraft, onSaveUser, busy, canManage, notFound }) {
  if (notFound) {
    return (
      <Card className="p-5">
        <SectionHeader title="User details" description="The selected user is no longer available." />
        <StateCard title="User not found" description="Choose another user from the list or create a new login." tone="red" />
      </Card>
    );
  }

  if (!user) {
    return (
      <Card className="p-5">
        <SectionHeader title="User details" description="Select a user to edit their account." />
        <StateCard title="No user selected" description="Choose a user from the list to edit role, status, or login details." tone="slate" />
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <SectionHeader title={user.name} description={`${user.id} Â· ${user.email}`} action={<UserStatusBadge status={user.status} />} />
      <div className="grid gap-3">
        <TimestampMeta createdAt={user.createdAt} updatedAt={user.updatedAt} />
        <div className="grid gap-3 md:grid-cols-2">
          <InputField label="Full name" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} disabled={!canManage || busy} />
          <InputField label="Email" type="email" value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} disabled={!canManage || busy} />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <InputField label="Phone" value={draft.phone} onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))} disabled={!canManage || busy} />
          <SelectField label="Role" value={draft.role} onChange={(event) => setDraft((current) => ({ ...current, role: event.target.value }))} disabled={!canManage || busy}>
            {USER_ROLE_OPTIONS.map((role) => <option key={role} value={role}>{role}</option>)}
          </SelectField>
          <SelectField label="Status" value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))} disabled={!canManage || busy}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </SelectField>
        </div>
        <InputField label="Reset password" type="text" value={draft.password} onChange={(event) => setDraft((current) => ({ ...current, password: event.target.value }))} placeholder="Leave blank to keep the current password" disabled={!canManage || busy} />
        <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-sm text-slate-600">
          <p><span className="font-black text-slate-950">Last login:</span> {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Never"}</p>
        </div>
        <Button onClick={onSaveUser} disabled={!canManage || busy}>Save user</Button>
      </div>
    </Card>
  );
}

function userRoleTone(role) {
  if (role === "Owner") return "violet";
  if (["Administrator", "Operations Manager"].includes(role)) return "blue";
  if (role === "Estimator") return "amber";
  if (role === "Foreman") return "green";
  return "slate";
}

function userAccessGroup(user) {
  if (["Owner", "Administrator", "Operations Manager", "Estimator"].includes(user?.role)) return "Office";
  if (user?.role === "Foreman") return "Field Lead";
  return "Field Crew";
}

function isOwnerRole(role) {
  return String(role || "").trim().toLowerCase() === "owner";
}

const OFFICE_USER_ROLES = ["Owner", "Administrator", "Operations Manager", "Estimator"];
const FIELD_USER_ROLES = ["Foreman", "Employee"];

function EmployeesTablePolished({
  rows,
  selectedId,
  onSelect,
  onOpenDetails,
  canManage,
  mobileMaxRows = null,
  mobileExpanded = false,
  onToggleMobileRows,
}) {
  const mobileRows = mobileMaxRows == null ? rows : rows.slice(0, mobileMaxRows);

  return (
    <>
      <div className="co-employees-mobile-list grid gap-3 p-3 md:hidden">
        {mobileRows.map((entry) => {
          const selected = entry.id === selectedId;

          return (
            <article
              key={entry.id}
              className={`co-employees-mobile-card co-mobile-record-card w-full rounded-[1.05rem] border p-4 text-left transition ${selected ? "is-selected border-orange-200 bg-orange-50/75" : "border-slate-200 bg-white hover:border-orange-200 hover:bg-orange-50/35"}`}
            >
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="break-words text-base font-black text-slate-950">{entry.name || "Unnamed user"}</p>
                  <p className="mt-1 break-words text-xs font-bold text-slate-500">{entry.email || "Email pending"} / {entry.phone || "Phone not set"}</p>
                </div>
                <UserStatusBadge status={entry.status} />
              </div>
              <div className="co-employees-mobile-metrics">
                <span>Role <strong>{entry.role || "Employee"}</strong></span>
                <span>Access <strong>{userAccessGroup(entry)}</strong></span>
                <span>Login <strong>{entry.lastLoginAt ? formatDateTime(entry.lastLoginAt) : "Never"}</strong></span>
              </div>
              <button
                type="button"
                className="co-employees-mobile-card-action"
                onClick={() => {
                  onSelect(entry.id);
                  onOpenDetails?.(entry.id);
                }}
              >
                Open {canManage ? "edit" : "details"}
              </button>
            </article>
          );
        })}
        {rows.length > 2 ? (
          <button type="button" className="co-employees-mobile-list-toggle" onClick={onToggleMobileRows}>
            {mobileExpanded ? "Show priority users" : `Show all ${rows.length} users`}
          </button>
        ) : null}
      </div>
      <div className="co-employees-list-scroll hidden min-w-0 overflow-auto md:block">
        <table className="co-employees-command-table w-full min-w-[900px] text-left">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Access</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Last Login</th>
              <th>Open</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((entry) => {
              const selected = entry.id === selectedId;

              return (
                <tr key={entry.id} onClick={() => onSelect(entry.id)} className={`cursor-pointer transition hover:bg-orange-50/45 ${selected ? "bg-orange-50/70" : ""}`}>
                  <td>
                    <p className="font-black text-slate-950">{entry.name || "Unnamed user"}</p>
                    <p className="text-xs font-bold text-slate-500">{entry.email || "Email pending"}</p>
                  </td>
                  <td><Badge tone={userRoleTone(entry.role)}>{entry.role || "Employee"}</Badge></td>
                  <td className="font-bold text-slate-700">{userAccessGroup(entry)}</td>
                  <td className="font-bold text-slate-700">{entry.phone || "Not set"}</td>
                  <td><UserStatusBadge status={entry.status} /></td>
                  <td className="font-bold text-slate-700">{entry.lastLoginAt ? formatDateTime(entry.lastLoginAt) : "Never"}</td>
                  <td>
                    <button type="button" className="co-employees-icon-button" onClick={(event) => { event.stopPropagation(); onSelect(entry.id); onOpenDetails?.(entry.id); }} aria-label={`Open employee ${entry.name || entry.id}`}>
                      <Icon name="arrowUpRight" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function EmployeesCommandRailPolished({ user, canManage, busy, onOpenTool }) {
  if (!user) {
    return (
      <div className="co-employees-right-rail co-employees-command-assistant space-y-4">
        <div className="co-employees-rail-card co-employees-assistant-card p-4">
          <SectionHeader title="Access Console" description="Select a user to review role, status, and login readiness." />
          <div className="co-employees-empty-rail">
            <span><Icon name="users" /></span>
            <strong>No employee selected</strong>
            <p>Use this console to keep office roles and field roles clear without exposing admin access to crew users.</p>
          </div>
          {canManage ? <Button type="button" className="mt-3 w-full" onClick={() => onOpenTool("create")}>New User</Button> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="co-employees-right-rail co-employees-command-assistant space-y-4">
      <div className="co-employees-rail-card co-employees-assistant-card p-4">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Selected user</p>
            <h3 className="mt-2 break-words text-xl font-black leading-tight text-slate-950">{user.name || "Unnamed user"}</h3>
            <p className="mt-1 break-words text-xs font-black text-slate-500">{user.email || "Email pending"} / {user.phone || "Phone not set"}</p>
          </div>
          <UserStatusBadge status={user.status} />
        </div>

        <div className="co-employees-selected-metrics">
          <div>
            <span>Role</span>
            <strong>{user.role || "Employee"}</strong>
          </div>
          <div>
            <span>Access</span>
            <strong>{userAccessGroup(user)}</strong>
          </div>
          <div>
            <span>Status</span>
            <strong>{user.status === "active" ? "Active" : "Inactive"}</strong>
          </div>
          <div>
            <span>Last Login</span>
            <strong>{user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Never"}</strong>
          </div>
        </div>

        <div className="co-employees-note-panel">
          <span>Role boundary</span>
          <p>{["Foreman", "Employee"].includes(user.role) ? "Field roles stay limited to field-safe modules and assigned job context." : "Office roles can access operational tools according to the existing permission map."}</p>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button type="button" size="sm" onClick={() => onOpenTool("details")}>{canManage ? "Edit User" : "Review"}</Button>
          {canManage ? <Button type="button" size="sm" variant="secondary" onClick={() => onOpenTool("create")}>New User</Button> : null}
        </div>
      </div>

      <div className="co-employees-rail-card co-employees-assistant-card p-4">
        <SectionHeader title="Login Readiness" description="Keep employee records usable for assignments and field workflows." />
        <div className="co-employees-readiness-list">
          <span data-state={user.name ? "ready" : "needs"}>Name <strong>{user.name ? "Set" : "Needed"}</strong></span>
          <span data-state={user.email ? "ready" : "needs"}>Email <strong>{user.email ? "Set" : "Needed"}</strong></span>
          <span data-state={user.role ? "ready" : "needs"}>Role <strong>{user.role || "Needed"}</strong></span>
          <span data-state={user.status === "active" ? "ready" : "needs"}>Status <strong>{user.status === "active" ? "Active" : "Inactive"}</strong></span>
        </div>
      </div>
    </div>
  );
}

function UserCreatePanelPolished({ draft, setDraft, onCreateUser, disabled, provisionedNotice, roleOptions = USER_ROLE_OPTIONS, onDismissProvisionNotice }) {
  const activationCopyValue = provisionedNotice?.activationUrl
    ? `${typeof window !== "undefined" ? window.location.origin : ""}${provisionedNotice.activationUrl}`
    : provisionedNotice?.temporaryPassword || "";
  const inviteExpiresAt = provisionedNotice?.inviteExpiresAt ? formatDateTime(provisionedNotice.inviteExpiresAt) : "";
  return (
    <Card className="co-employees-form-card p-4">
      <SectionHeader title="Create User" description="Create office or field access with the current role boundaries. Leave password blank for a manual activation link." />
      {provisionedNotice ? (
        <div className="co-employees-temp-password mb-4">
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <span>{provisionedNotice.activationToken ? "Activation invite ready" : "Temporary password ready"}</span>
              <strong>{provisionedNotice.email}</strong>
              <code>{activationCopyValue}</code>
              <p>{provisionedNotice.activationToken ? `Copy and send this one-time activation link manually. It expires${inviteExpiresAt ? ` ${inviteExpiresAt}` : ""}.` : "Share this temporary password manually and have the user change it after sign-in."}</p>
            </div>
            <div className="grid gap-2 sm:flex sm:shrink-0">
              <Button type="button" size="sm" variant="secondary" onClick={() => navigator.clipboard?.writeText?.(activationCopyValue)}>
                <Icon name="clipboard" />
                Copy
              </Button>
              {onDismissProvisionNotice ? <Button type="button" size="sm" variant="ghost" onClick={onDismissProvisionNotice}>Dismiss</Button> : null}
            </div>
          </div>
        </div>
      ) : null}
      <form className="co-employees-form-grid" onSubmit={onCreateUser}>
        <InputField label="Full name" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
        <InputField label="Email" type="email" value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} />
        <InputField label="Phone" value={draft.phone} onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))} />
        <SelectField label="Role" value={draft.role} onChange={(event) => setDraft((current) => ({ ...current, role: event.target.value }))}>
          {roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
        </SelectField>
        <SelectField label="Status" value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </SelectField>
        <InputField label="Password" type="password" value={draft.password} onChange={(event) => setDraft((current) => ({ ...current, password: event.target.value }))} placeholder="Leave blank to create an activation invite" />
        <p className="text-xs font-bold leading-5 text-slate-500 md:col-span-2">Field roles still receive field-safe access only. Apex HQ does not send invite email or SMS automatically from this screen.</p>
        <div className="md:col-span-2">
          <Button type="submit" disabled={disabled}>
            <Icon name="plus" />
            Add user
          </Button>
        </div>
      </form>
    </Card>
  );
}

function UserDetailPanelPolished({ user, draft, setDraft, onSaveUser, onResendInvite, busy, canManage, notFound, roleOptions = USER_ROLE_OPTIONS, currentUserIsOwner = false, provisionedNotice, onDismissProvisionNotice }) {
  if (notFound) {
    return (
      <Card className="co-employees-form-card p-4">
        <StateCard title="User not found" description="Choose another user from the list or create a new login." tone="red" />
      </Card>
    );
  }

  if (!user) {
    return (
      <Card className="co-employees-form-card p-4">
        <StateCard title="No user selected" description="Choose a user from the board to edit role, status, or login details." tone="slate" />
      </Card>
    );
  }

  const selectedUserIsOwner = isOwnerRole(user.role);
  const canEditUser = canManage && (currentUserIsOwner || !selectedUserIsOwner);
  const canReissueInvite = canEditUser && (user.status || "active") === "active" && ["pending", "expired"].includes(user.inviteStatus || "");
  const activationCopyValue = provisionedNotice?.activationUrl
    ? `${typeof window !== "undefined" ? window.location.origin : ""}${provisionedNotice.activationUrl}`
    : "";
  const showProvisionedNotice = provisionedNotice?.id === user.id && activationCopyValue;
  const inviteExpiresAt = provisionedNotice?.inviteExpiresAt ? formatDateTime(provisionedNotice.inviteExpiresAt) : "";

  return (
    <Card className="co-employees-form-card p-4">
      <SectionHeader title={`Edit ${user.name || "User"}`} description={`${user.id} / ${user.email || "Email pending"}`} action={<UserStatusBadge status={user.status} />} />
      {!canEditUser ? (
        <div className="co-employees-owner-lock mb-3">
          <span><Icon name="lock" /></span>
          <p>Owner accounts can only be changed by an active Owner.</p>
        </div>
      ) : null}
      {showProvisionedNotice ? (
        <div className="co-employees-temp-password mb-4">
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <span>Activation invite ready</span>
              <strong>{provisionedNotice.email}</strong>
              <code>{activationCopyValue}</code>
              <p>{`Copy and send this one-time activation link manually${inviteExpiresAt ? ` before ${inviteExpiresAt}` : ""}. If it expires, reissue a new invite here.`}</p>
            </div>
            <div className="grid gap-2 sm:flex sm:shrink-0">
              <Button type="button" size="sm" variant="secondary" onClick={() => navigator.clipboard?.writeText?.(activationCopyValue)}>
                <Icon name="clipboard" />
                Copy
              </Button>
              {onDismissProvisionNotice ? <Button type="button" size="sm" variant="ghost" onClick={onDismissProvisionNotice}>Dismiss</Button> : null}
            </div>
          </div>
        </div>
      ) : null}
      <div className="co-employees-timestamp-meta">
        <TimestampMeta createdAt={user.createdAt} updatedAt={user.updatedAt} />
      </div>
      <div className="co-employees-form-grid mt-3">
        <InputField label="Full name" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} disabled={!canEditUser || busy} />
        <InputField label="Email" type="email" value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} disabled={!canEditUser || busy} />
        <InputField label="Phone" value={draft.phone} onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))} disabled={!canEditUser || busy} />
        <SelectField label="Role" value={draft.role} onChange={(event) => setDraft((current) => ({ ...current, role: event.target.value }))} disabled={!canEditUser || busy}>
          {roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
        </SelectField>
        <SelectField label="Status" value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))} disabled={!canEditUser || busy}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </SelectField>
        <InputField label="Reset password" type="password" value={draft.password} onChange={(event) => setDraft((current) => ({ ...current, password: event.target.value }))} placeholder="Leave blank to keep the current password" disabled={!canEditUser || busy} />
      </div>
      <div className="co-employees-note-panel">
        <span>Last login</span>
        <p>{user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Never"}</p>
        {user.inviteStatus ? <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-slate-500">Invite: {user.inviteStatus}. Pending and expired invites can be reissued without changing the user's role.</p> : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={onSaveUser} disabled={!canEditUser || busy}>Save user</Button>
        {canReissueInvite ? (
          <Button type="button" variant="secondary" onClick={() => onResendInvite?.(user.id)} disabled={busy}>
            Reissue invite
          </Button>
        ) : null}
      </div>
    </Card>
  );
}

function employeeRecordMatchesUser(record = {}, user = {}) {
  if (!record || !user) return false;
  const userId = String(user.id || "").toLowerCase();
  const userName = String(user.name || "").toLowerCase();
  const values = [
    record.userId,
    record.employeeId,
    record.assignedUserId,
    record.createdById,
    record.createdBy,
    record.reportedById,
    record.uploaderId,
    record.userName,
    record.employeeName,
    record.createdByName,
    record.reportedByName,
    record.uploaderName,
  ].map((value) => String(value || "").toLowerCase());
  return Boolean(userId && values.includes(userId)) || Boolean(userName && values.includes(userName));
}

function employeeAssignedJobs(user = {}, jobs = []) {
  if (!user) return [];
  const userId = String(user.id || "");
  const userName = String(user.name || "").toLowerCase();
  return normalizeObjectArray(jobs).filter((job) => {
    if (job.archivedAt) return false;
    const directValues = [
      job.assignedUserId,
      job.assignedEmployeeId,
      job.assignedForemanId,
      job.foremanId,
      job.createdById,
    ].map((value) => String(value || ""));
    const nameValues = [
      job.assignedUserName,
      job.assignedEmployeeName,
      job.assignedForemanName,
      job.foremanName,
      todayWorkForemanLabel(job),
    ].map((value) => String(value || "").toLowerCase());
    const assignmentMatch = todayWorkCrewAssignments(job).some((assignment) => (
      String(assignment.userId || assignment.employeeId || assignment.id || "") === userId
      || String(assignment.name || assignment.userName || assignment.employeeName || "").toLowerCase() === userName
    ));
    return directValues.includes(userId) || Boolean(userName && nameValues.includes(userName)) || assignmentMatch;
  });
}

function employeeOperationsSummary(user, {
  jobs = [],
  timeEntries = [],
  dailyReports = [],
  uploads = [],
  safetyIncidents = [],
  toolChecklists = [],
} = {}) {
  const assignedJobs = employeeAssignedJobs(user, jobs);
  const activeJobs = assignedJobs.filter((job) => ["in_progress", "scheduled", "planned"].includes(normalizeJobStatus(job.status || job.stage)));
  const activeClock = normalizeObjectArray(timeEntries).find((entry) => !entry.archivedAt && employeeRecordMatchesUser(entry, user) && entry.clockInAt && !entry.clockOutAt);
  const reports = normalizeObjectArray(dailyReports).filter((report) => !report.archivedAt && employeeRecordMatchesUser(report, user));
  const proofUploads = normalizeObjectArray(uploads).filter((upload) => !upload.archivedAt && employeeRecordMatchesUser(upload, user));
  const incidents = normalizeObjectArray(safetyIncidents).filter((incident) => !incident.archivedAt && employeeRecordMatchesUser(incident, user));
  const checklists = normalizeObjectArray(toolChecklists).filter((checklist) => !checklist.archivedAt && employeeRecordMatchesUser(checklist, user));
  const readinessGaps = [
    !user?.name ? "Name" : null,
    !user?.email ? "Email" : null,
    !user?.role ? "Role" : null,
    user?.status !== "active" ? "Active status" : null,
  ].filter(Boolean);
  const isField = FIELD_USER_ROLES.includes(user?.role);
  const tone = incidents.length
    ? "red"
    : readinessGaps.length
      ? "amber"
      : activeClock || activeJobs.length
        ? "green"
        : isField
          ? "orange"
          : "blue";
  const nextAction = incidents.length
    ? "Review safety"
    : readinessGaps.length
      ? "Fix readiness"
      : activeClock
        ? "Check clock"
        : activeJobs.length
          ? "Review assignment"
          : isField
            ? "Assign crew work"
            : "Keep access ready";

  return {
    assignedJobs,
    activeJobs,
    activeClock,
    reports,
    proofUploads,
    incidents,
    checklists,
    readinessGaps,
    isField,
    tone,
    nextAction,
  };
}

function EmployeeOperationsWorkbench({
  users = [],
  selectedUser,
  jobs = [],
  timeEntries = [],
  dailyReports = [],
  uploads = [],
  safetyIncidents = [],
  toolChecklists = [],
  canManage,
  onSelectUser,
  onOpenTool,
  onSetRoleFilter,
  onSetStatusFilter,
}) {
  const visibleUsers = normalizeObjectArray(users);
  const summaries = visibleUsers.map((employee) => ({
    employee,
    summary: employeeOperationsSummary(employee, { jobs, timeEntries, dailyReports, uploads, safetyIncidents, toolChecklists }),
  }));
  const selectedSummary = employeeOperationsSummary(selectedUser, { jobs, timeEntries, dailyReports, uploads, safetyIncidents, toolChecklists });
  const queueRows = summaries
    .sort((left, right) => Number(right.summary.incidents.length > 0) - Number(left.summary.incidents.length > 0)
      || Number(right.summary.readinessGaps.length > 0) - Number(left.summary.readinessGaps.length > 0)
      || right.summary.activeJobs.length - left.summary.activeJobs.length
      || Number(right.summary.isField) - Number(left.summary.isField))
    .slice(0, 6);
  const focusUser = selectedUser || queueRows[0]?.employee || null;
  const focusSummary = selectedUser ? selectedSummary : queueRows[0]?.summary || employeeOperationsSummary(null);
  const allFieldUsers = summaries.filter((item) => item.summary.isField);
  const activeUsers = summaries.filter((item) => item.employee.status === "active");
  const activeAssignments = summaries.reduce((sum, item) => sum + item.summary.activeJobs.length, 0);
  const readinessGaps = summaries.filter((item) => item.summary.readinessGaps.length);
  const activeClocks = summaries.filter((item) => item.summary.activeClock);
  const employeeKpis = [
    { label: "Crew records", value: visibleUsers.length, helper: "Visible people", tone: "blue", action: "All roles", onClick: () => onSetRoleFilter("All roles") },
    { label: "Field crew", value: allFieldUsers.length, helper: "Foremen and employees", tone: "orange", action: "Review field", onClick: () => onSetRoleFilter("Field roles") },
    { label: "Active jobs", value: activeAssignments, helper: "Assignments in motion", tone: "green", action: "Open active", onClick: () => onSetStatusFilter("active") },
    { label: "Readiness gaps", value: readinessGaps.length, helper: "Setup or inactive", tone: readinessGaps.length ? "amber" : "green", action: "Fix gaps", onClick: () => onSetRoleFilter("All roles") },
  ];
  const readinessSteps = [
    { label: "Role", value: focusUser?.role || "Unassigned" },
    { label: "Crew", value: focusSummary.isField ? userAccessGroup(focusUser) : "Office" },
    { label: "Job", value: focusSummary.activeJobs[0] ? jobTitle(focusSummary.activeJobs[0]) : focusSummary.assignedJobs.length ? "Linked" : "Unassigned" },
    { label: "Time", value: focusSummary.activeClock ? "Clocked in" : "No live clock" },
    { label: "Proof", value: focusSummary.reports.length || focusSummary.proofUploads.length ? `${focusSummary.reports.length + focusSummary.proofUploads.length} items` : "None" },
    { label: "Safety", value: focusSummary.incidents.length ? `${focusSummary.incidents.length} flag${focusSummary.incidents.length === 1 ? "" : "s"}` : "Clear" },
  ];

  return (
    <CommandPageFrame
      className="co-people-northstar-frame co-employees-northstar-frame"
      kpis={
        <div className="co-people-kpis">
          {employeeKpis.map((item) => (
            <button key={item.label} type="button" className="co-people-kpi" data-tone={item.tone} onClick={item.onClick}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <em>{item.helper}</em>
              <b>{item.action}</b>
            </button>
          ))}
        </div>
      }
      rail={
        <AssistantRail
          eyebrow="Apex Assistant"
          title="Crew readiness"
          description={focusUser ? `${focusUser.name}: ${focusSummary.nextAction}.` : "Select a crew or office user to inspect assignment, time, proof, and safety context."}
          priorities={[
            { value: allFieldUsers.length, label: "Field crew", tone: "orange" },
            { value: activeClocks.length, label: "Clocked in", tone: activeClocks.length ? "green" : "slate" },
            { value: activeAssignments, label: "Active assignments", tone: activeAssignments ? "green" : "slate" },
            { value: readinessGaps.length, label: "Readiness gaps", tone: readinessGaps.length ? "amber" : "green" },
          ]}
          actions={[
            { label: "Review details", icon: "users", onClick: () => onOpenTool("details"), disabled: !focusUser },
            canManage ? { label: "New user", icon: "plus", onClick: () => onOpenTool("create") } : null,
            { label: "Field crew", icon: "hardhat", onClick: () => onSetRoleFilter("Field roles") },
          ].filter(Boolean)}
        />
      }
    >
      <section className="co-people-workbench" aria-label="Crew operations command record">
        <div className="co-people-workbench-head">
          <div className="min-w-0">
            <p>Crew operations command</p>
            <h2>People, assignments, time, proof, and safety readiness</h2>
            <span>Employee records stay tied to field work instead of drifting into generic HR: who is assigned, clocked in, ready, blocked, or missing setup.</span>
          </div>
          <div className="co-people-workbench-actions">
            {canManage ? <Button type="button" onClick={() => onOpenTool("create")}>New User</Button> : null}
            <Button type="button" variant="secondary" onClick={() => onSetRoleFilter("Field roles")}>Field Crew</Button>
          </div>
        </div>
        <div className="co-people-workbench-grid">
          <div className="co-people-record-queue">
            <div className="co-people-section-head">
              <span>Crew queue</span>
              <strong>{queueRows.length || "Clear"}</strong>
            </div>
            {queueRows.length ? queueRows.map(({ employee, summary }) => (
              <WorkQueueCard
                key={employee.id}
                eyebrow={summary.incidents.length ? "Safety flag" : summary.readinessGaps.length ? "Needs readiness" : summary.activeJobs.length ? "Assigned work" : summary.isField ? "Field crew" : "Office"}
                title={employee.name || employee.email || "Unnamed user"}
                meta={[employee.role, employee.phone || employee.email, userAccessGroup(employee)].filter(Boolean).join(" / ")}
                status={employee.status === "active" ? "Active" : "Inactive"}
                tone={summary.tone}
                actionLabel={summary.nextAction}
                selected={focusUser?.id === employee.id}
                onClick={() => onSelectUser(employee.id)}
              >
                <div className="co-people-row-facts">
                  <span>Jobs <strong>{summary.activeJobs.length || summary.assignedJobs.length}</strong></span>
                  <span>Time <strong>{summary.activeClock ? "Live" : "Clear"}</strong></span>
                  <span>Proof <strong>{summary.reports.length + summary.proofUploads.length}</strong></span>
                  <span data-state={summary.incidents.length || summary.readinessGaps.length ? "needs" : "ready"}>Ready <strong>{summary.incidents.length ? "Safety" : summary.readinessGaps.length ? "Gap" : "Yes"}</strong></span>
                </div>
              </WorkQueueCard>
            )) : (
              <div className="co-people-empty"><strong>No employee records visible</strong><span>Clear filters or create a crew record to build the queue.</span></div>
            )}
          </div>

          <div className="co-people-selected-panel">
            <div className="co-people-section-head">
              <span>Selected person</span>
              <strong>{focusUser ? focusSummary.nextAction : "Waiting"}</strong>
            </div>
            {focusUser ? (
              <>
                <div className="co-people-selected-title">
                  <div className="min-w-0">
                    <h3>{focusUser.name || focusUser.email}</h3>
                    <p>{[focusUser.role, userAccessGroup(focusUser), focusUser.email].filter(Boolean).join(" / ")}</p>
                  </div>
                  <UserStatusBadge status={focusUser.status} />
                </div>
                <div className="co-people-proof-grid">
                  {readinessSteps.map((step) => <span key={step.label}><em>{step.label}</em><strong>{step.value}</strong></span>)}
                </div>
                <div className="co-people-next-panel">
                  <span>Next action</span>
                  <strong>{focusSummary.nextAction}</strong>
                  <p>{focusSummary.readinessGaps.length ? `Missing: ${focusSummary.readinessGaps.join(", ")}.` : `${focusSummary.reports.length} reports, ${focusSummary.proofUploads.length} proof uploads, ${focusSummary.checklists.length} checklist records.`}</p>
                </div>
                <div className="co-people-workbench-actions co-people-selected-actions">
                  <Button type="button" onClick={() => onOpenTool("details")}>{canManage ? "Edit User" : "Review"}</Button>
                  <Button type="button" variant="secondary" onClick={() => onSetRoleFilter(focusSummary.isField ? "Field roles" : "Office roles")}>{focusSummary.isField ? "Field Crew" : "Office Roles"}</Button>
                </div>
              </>
            ) : (
              <div className="co-people-empty"><strong>No person selected</strong><span>Select a crew or office user to inspect operational readiness.</span></div>
            )}
          </div>
        </div>
      </section>
    </CommandPageFrame>
  );
}

function EmployeesPagePolished({
  users,
  jobs = [],
  timeEntries = [],
  dailyReports = [],
  uploads = [],
  safetyIncidents = [],
  toolChecklists = [],
  filter,
  setFilter,
  statusFilter,
  setStatusFilter,
  search,
  setSearch,
  selectedUserId,
  onSelectUser,
  selectedUser,
  userDraft,
  setUserDraft,
  createDraft,
  setCreateDraft,
  onCreateUser,
  onSaveUser,
  onResendUserInvite,
  busy,
  errorMessage,
  permissions,
  provisionedNotice,
  user: currentUser,
  onDismissProvisionNotice,
}) {
  const canView = permissions.users.canView;
  const canManage = permissions.users.canManage;
  const canUseEmployeesCommandShell = useDesktopCommandViewport(1180);
  const [showTools, setShowTools] = useState(false);
  const [toolTab, setToolTab] = useState("details");
  const [showAllMobileRows, setShowAllMobileRows] = useState(false);
  const [showCreateUserShell, setShowCreateUserShell] = useState(false);
  const toolsRef = useRef(null);
  const listState = useMemo(() => deriveUserListState(users, {
    query: search,
    role: filter,
    status: statusFilter,
  }), [filter, search, statusFilter, users]);
  const visibleRows = listState.filteredUsers;
  const notFound = Boolean(selectedUserId) && !selectedUser;
  const currentUserIsOwner = isOwnerRole(currentUser?.role);
  const roleOptionsForManager = currentUserIsOwner ? USER_ROLE_OPTIONS : USER_ROLE_OPTIONS.filter((role) => !isOwnerRole(role));
  const editRoleOptions = currentUserIsOwner || isOwnerRole(selectedUser?.role)
    ? USER_ROLE_OPTIONS
    : roleOptionsForManager;
  const activeUsers = users.filter((entry) => entry.status === "active");
  const allFieldUsers = users.filter((entry) => FIELD_USER_ROLES.includes(entry.role));
  const readinessGapUsers = users.filter((entry) => !entry.name || !entry.email || !entry.role || !entry.status);
  const fieldUsers = visibleRows.filter((entry) => FIELD_USER_ROLES.includes(entry.role));
  const officeUsers = visibleRows.filter((entry) => OFFICE_USER_ROLES.includes(entry.role));
  const ownerUsers = users.filter((entry) => isOwnerRole(entry.role));
  const inactiveUsers = users.filter((entry) => entry.status === "inactive");
  const employeeKpis = [
    { label: "Visible Users", value: visibleRows.length, helper: "Matching current filters", icon: "users", tone: "blue" },
    { label: "Active", value: activeUsers.length, helper: "Can sign in now", icon: "check", tone: "green", actionLabel: "Active", onAction: () => setStatusFilter("active") },
    { label: "Field Crew", value: fieldUsers.length, helper: "Foremen and employees", icon: "hardhat", tone: "amber" },
    { label: "Office Roles", value: officeUsers.length, helper: "Admin and office access", icon: "settings", tone: "blue" },
    { label: "Inactive", value: inactiveUsers.length, helper: "Disabled logins", icon: "lock", tone: "slate", actionLabel: "Inactive", onAction: () => setStatusFilter("inactive") },
  ];
  const employeeShellKpis = employeeKpis.slice(0, 4).map(({ onAction, actionLabel, ...item }) => ({
    ...item,
    onClick: onAction,
  }));

  function clearFilters() {
    setFilter("All roles");
    setStatusFilter("All statuses");
    setSearch("");
  }

  function openTools(nextTab = "details") {
    if (nextTab !== "create") onDismissProvisionNotice?.();
    setToolTab(nextTab);
    setShowTools(true);
    if (window.innerWidth < 1180) {
      window.setTimeout(() => {
        toolsRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
        if (window.innerWidth < 768) {
          window.setTimeout(() => window.scrollBy({ top: 150, behavior: "smooth" }), 180);
        }
      }, 0);
    }
  }

  function openUserTools(userId, nextTab = "details") {
    if (userId) onSelectUser(userId);
    openTools(nextTab);
  }

  function openPriorityUser(matchUser, options = {}) {
    const targetUser = visibleRows.find(matchUser) || users.find(matchUser);
    if (options.roleFilter) setFilter(options.roleFilter);
    if (options.statusFilter) setStatusFilter(options.statusFilter);
    if (options.search !== undefined) setSearch(options.search);
    if (targetUser?.id) onSelectUser(targetUser.id);
    if (options.toolTab) openTools(options.toolTab);
  }

  const firstFieldUser = allFieldUsers[0] || null;
  const activeLoginsPriorityCard = {
    label: "Active logins",
    value: activeUsers.length,
    helper: activeUsers.length ? "Users who can sign in and work from the current permission map." : "No active workspace logins are available.",
    icon: "check",
    tone: activeUsers.length ? "green" : "amber",
    actionLabel: activeUsers.length ? "Review" : "Needs setup",
    onAction: () => openPriorityUser((entry) => entry.status === "active", { statusFilter: activeUsers.length ? "active" : "All statuses", roleFilter: "All roles", search: "", toolTab: activeUsers.length ? "details" : "" }),
  };
  const fieldRolesPriorityCard = {
    label: "Field roles",
    value: allFieldUsers.length,
    helper: allFieldUsers.length ? "Foreman and employee access stays separated from office/admin tools." : "No field crew accounts have been created yet.",
    icon: "hardhat",
    tone: allFieldUsers.length ? "orange" : "slate",
    actionLabel: allFieldUsers.length ? "Review field" : "None",
    onAction: () => openPriorityUser((entry) => FIELD_USER_ROLES.includes(entry.role), { roleFilter: firstFieldUser?.role || "All roles", statusFilter: "All statuses", search: "", toolTab: firstFieldUser ? "details" : "" }),
  };
  const readinessPriorityCard = {
    label: "Needs readiness",
    value: readinessGapUsers.length,
    helper: readinessGapUsers.length ? "Some accounts are missing name, email, role, or status details." : "Core user records have their required setup fields.",
    icon: "alert",
    tone: readinessGapUsers.length ? "amber" : "green",
    actionLabel: readinessGapUsers.length ? "Fix" : "Ready",
    onAction: () => openPriorityUser((entry) => readinessGapUsers.some((candidate) => candidate.id === entry.id), { roleFilter: "All roles", statusFilter: "All statuses", search: "", toolTab: readinessGapUsers.length ? "details" : "" }),
  };
  const newUserPriorityCard = {
    label: "New user",
    value: canManage ? "Ready" : "Locked",
    helper: canManage ? "Create office, foreman, or employee access from the existing workflow." : "This role can review employees but cannot create logins.",
    icon: "plus",
    tone: canManage ? "blue" : "slate",
    actionLabel: canManage ? "Create" : "View only",
    onAction: () => canManage ? openTools("create") : openPriorityUser((entry) => entry.id === selectedUser?.id),
  };
  const employeePriorityCards = visibleRows.length === 0 && canManage
    ? [newUserPriorityCard, activeLoginsPriorityCard, fieldRolesPriorityCard, readinessPriorityCard]
    : [activeLoginsPriorityCard, fieldRolesPriorityCard, readinessPriorityCard, newUserPriorityCard];
  const summaryStats = [
    { label: "Visible", value: visibleRows.length, helper: "Current view" },
    { label: "Active", value: activeUsers.length, helper: "Can sign in" },
    { label: "Field", value: allFieldUsers.length, helper: "Crew users" },
    { label: "Owners", value: ownerUsers.length, helper: "Protected" },
    { label: "Inactive", value: inactiveUsers.length, helper: "Disabled" },
  ];
  const accessFilters = [
    { label: "All", action: () => { setFilter("All roles"); setStatusFilter("All statuses"); setSearch(""); }, active: filter === "All roles" && statusFilter === "All statuses" && !search },
    { label: "Office", action: () => { setFilter("Office roles"); setStatusFilter("All statuses"); setSearch(""); }, active: filter === "Office roles" },
    { label: "Field", action: () => { setFilter("Field roles"); setStatusFilter("All statuses"); setSearch(""); }, active: filter === "Field roles" },
    { label: "Inactive", action: () => { setFilter("All roles"); setStatusFilter("inactive"); setSearch(""); }, active: statusFilter === "inactive" },
    { label: "Needs setup", action: () => openPriorityUser((entry) => readinessGapUsers.some((candidate) => candidate.id === entry.id), { roleFilter: "All roles", statusFilter: "All statuses", search: "", toolTab: readinessGapUsers.length ? "details" : "" }), active: false },
  ];
  const employeeShellQueue = useMemo(() => {
    const userItems = visibleRows.map((entry) => {
      const summary = employeeOperationsSummary(entry, { jobs, timeEntries, dailyReports, uploads, safetyIncidents, toolChecklists });
      const hasReadinessGap = summary.readinessGaps.length > 0;
      const statusLabel = summary.incidents.length
        ? "Safety Flag"
        : hasReadinessGap
          ? "Needs Setup"
          : summary.activeClock
            ? "Clocked In"
            : summary.activeJobs.length
              ? "Assigned Work"
              : entry.status === "active"
                ? "Active"
                : "Inactive";
      const priorityScore = summary.incidents.length
        ? 90
        : hasReadinessGap
          ? 70
          : summary.activeClock
            ? 60
            : summary.activeJobs.length
              ? 50
              : FIELD_USER_ROLES.includes(entry.role)
                ? 30
                : entry.status === "active"
                  ? 20
                  : 10;

      return {
        id: `user:${entry.id}`,
        kind: "user",
        user: entry,
        summary,
        title: entry.name || entry.email || "Unnamed user",
        meta: [entry.role, entry.phone || entry.email, userAccessGroup(entry)].filter(Boolean).join(" / "),
        sourceLabel: userAccessGroup(entry),
        status: statusLabel,
        statusLabel,
        tone: summary.tone,
        actionLabel: canManage ? "Review" : "View",
        priorityScore,
        badges: [
          { label: entry.role || "Employee", tone: userRoleTone(entry.role) },
          { label: entry.status === "active" ? "Active" : "Inactive", tone: entry.status === "active" ? "green" : "slate" },
          { label: `${summary.activeJobs.length || summary.assignedJobs.length} jobs`, tone: summary.activeJobs.length ? "green" : "slate" },
        ],
      };
    }).sort((left, right) => (
      right.priorityScore - left.priorityScore ||
      left.title.localeCompare(right.title)
    ));

    return [
      canManage ? {
        id: "create-user",
        kind: "create",
        title: "New user",
        meta: "Create office or field access",
        sourceLabel: "Create",
        status: "Manual Invite",
        statusLabel: "Manual Invite",
        tone: "blue",
        actionLabel: "Create",
      } : null,
      ...userItems,
    ].filter(Boolean);
  }, [canManage, dailyReports, jobs, safetyIncidents, timeEntries, toolChecklists, uploads, visibleRows]);
  const selectedEmployeeShellItem = useMemo(() => {
    if (showCreateUserShell) return employeeShellQueue.find((item) => item.kind === "create") || null;
    return employeeShellQueue.find((item) => item.kind === "user" && item.user?.id === selectedUserId)
      || employeeShellQueue.find((item) => item.kind === "user")
      || employeeShellQueue[0]
      || null;
  }, [employeeShellQueue, selectedUserId, showCreateUserShell]);

  useEffect(() => {
    if (!canView || visibleRows.length === 0) return;
    if (!selectedUserId || !visibleRows.some((entry) => entry.id === selectedUserId)) {
      onSelectUser(visibleRows[0].id);
    }
  }, [canView, onSelectUser, selectedUserId, visibleRows]);

  useEffect(() => {
    if (!canUseEmployeesCommandShell || showCreateUserShell || !selectedUserId) return;
    const selectedIsVisible = employeeShellQueue.some((item) => item.kind === "user" && item.user?.id === selectedUserId);
    if (selectedIsVisible) return;
    const nextUserItem = employeeShellQueue.find((item) => item.kind === "user");
    if (nextUserItem?.user?.id) onSelectUser(nextUserItem.user.id);
  }, [canUseEmployeesCommandShell, employeeShellQueue, onSelectUser, selectedUserId, showCreateUserShell]);

  function selectEmployeeShellItem(item) {
    if (!item) return;
    if (item.kind === "create") {
      setShowCreateUserShell(true);
      onDismissProvisionNotice?.();
      return;
    }
    setShowCreateUserShell(false);
    if (item.user?.id) onSelectUser(item.user.id);
  }

  function openFirstEmployeeShellItem(predicate) {
    const nextItem = employeeShellQueue.find(predicate);
    if (nextItem) selectEmployeeShellItem(nextItem);
  }

  function renderEmployeeShellDetail(item) {
    if (item?.kind === "create") {
      return (
        <div className="co-employees-shell-detail-scroll">
          <UserCreatePanelPolished
            draft={createDraft}
            setDraft={setCreateDraft}
            onCreateUser={onCreateUser}
            disabled={busy || !canManage}
            provisionedNotice={provisionedNotice}
            roleOptions={roleOptionsForManager}
            onDismissProvisionNotice={onDismissProvisionNotice}
          />
        </div>
      );
    }

    return (
      <div className="co-employees-shell-detail-scroll">
        <UserDetailPanelPolished
          user={selectedUser}
          draft={userDraft}
          setDraft={setUserDraft}
          onSaveUser={onSaveUser}
          onResendInvite={onResendUserInvite}
          busy={busy}
          canManage={canManage}
          notFound={notFound}
          roleOptions={editRoleOptions}
          currentUserIsOwner={currentUserIsOwner}
          provisionedNotice={provisionedNotice}
          onDismissProvisionNotice={onDismissProvisionNotice}
        />
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="co-office-page co-employees-page">
        <PageHeader eyebrow="Office" title="Employees" description="This module is not available for this role." />
        <div className="px-5 sm:px-6 lg:px-8">
          <StateCard title="Employee access unavailable" description="Only office roles can manage workspace accounts." tone="slate" />
        </div>
      </div>
    );
  }

  if (canUseEmployeesCommandShell) {
    return (
      <div className="co-office-page co-employees-page co-employees-shell-page">
        <ApexOfficeCommandShell
          eyebrow="Office"
          title="Employees"
          description="Create and manage office, foreman, and employee logins while keeping role boundaries clean."
          kpis={employeeShellKpis}
          queue={{
            title: "User queue",
            description: `${employeeShellQueue.filter((item) => item.kind === "user").length} visible user${employeeShellQueue.filter((item) => item.kind === "user").length === 1 ? "" : "s"} from the current filters.`,
            items: employeeShellQueue,
            selectedId: selectedEmployeeShellItem?.id,
            onSelect: selectEmployeeShellItem,
            controls: (
              <div className="co-employees-shell-filter-console">
                <div className="co-employees-access-tabs">
                  {accessFilters.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      className={item.active ? "is-active" : ""}
                      onClick={() => {
                        setShowCreateUserShell(false);
                        if (item.label === "Needs setup") {
                          openFirstEmployeeShellItem((queueItem) => queueItem.kind === "user" && queueItem.statusLabel === "Needs Setup");
                          return;
                        }
                        item.action();
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <input
                  className="field-input"
                  value={search}
                  onChange={(event) => {
                    setShowCreateUserShell(false);
                    setSearch(event.target.value);
                  }}
                  placeholder="Search users..."
                />
              </div>
            ),
            emptyState: <StateCard title="No users available" description="Clear filters or create the first workspace login." tone="slate" />,
          }}
          detail={{
            title: selectedEmployeeShellItem?.kind === "create" ? "New user" : "Selected user",
            item: selectedEmployeeShellItem,
            render: renderEmployeeShellDetail,
            emptyState: <StateCard title="No user selected" description="Select a user from the queue to review role, login, and readiness details." tone="slate" />,
          }}
          quickActions={[
            canManage ? { id: "new-user", label: "New User", icon: "plus", onClick: () => openFirstEmployeeShellItem((item) => item.kind === "create") } : null,
            { id: "field-users", label: "Field Crew", icon: "hardhat", onClick: () => { setFilter("Field roles"); setStatusFilter("All statuses"); setSearch(""); setShowCreateUserShell(false); } },
            { id: "active-users", label: "Active", icon: "check", onClick: () => { setFilter("All roles"); setStatusFilter("active"); setSearch(""); setShowCreateUserShell(false); } },
          ].filter(Boolean)}
          className="co-employees-command-shell"
        />
      </div>
    );
  }

  return (
    <div className="co-office-page co-employees-page">
      <PageHeader
        eyebrow="Office"
        title="Employees"
        description="Create and manage office, foreman, and employee logins so assignments stay usable and role boundaries stay clean."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => setFilter("All roles")}>{visibleRows.length} visible</Button>
            {canManage ? <Button type="button" onClick={() => openTools("create")}>New User</Button> : null}
          </div>
        }
      />

      <div className="co-employees-overview-workbench">
        <EmployeeOperationsWorkbench
          users={visibleRows}
          selectedUser={selectedUser}
          jobs={jobs}
          timeEntries={timeEntries}
          dailyReports={dailyReports}
          uploads={uploads}
          safetyIncidents={safetyIncidents}
          toolChecklists={toolChecklists}
          canManage={canManage}
          onSelectUser={onSelectUser}
          onOpenTool={openTools}
          onSetRoleFilter={(nextFilter) => {
            setFilter(nextFilter);
            setSearch("");
          }}
          onSetStatusFilter={(nextStatus) => {
            setStatusFilter(nextStatus);
            setSearch("");
          }}
        />
      </div>

      <DesktopCommandWorkspaceFrame className="co-employees-desktop-workspace-frame">
        <div className="co-employees-kpi-grid co-command-kpi-grid mx-auto grid w-full max-w-[1520px] min-w-0 grid-cols-2 gap-2.5 px-5 pb-3 sm:px-6 lg:grid-cols-4 lg:px-6">
          {employeeKpis.slice(0, 4).map((item) => <CommandCenterKpiCard key={item.label} item={item} />)}
        </div>

        <div className="co-employees-command-layout mx-auto grid w-full max-w-[1520px] min-w-0 gap-3 px-5 pb-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-6">
          <div className="co-employees-board-stack min-w-0">
            <Card className="co-employees-main-board overflow-hidden">
              <div className="co-employees-board-header border-b border-slate-200 bg-white p-4">
                <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <h2 className="text-base font-black uppercase tracking-[0.04em] text-slate-950">Workspace Access Board</h2>
                    <p className="mt-1 text-sm font-bold leading-5 text-slate-600">Scan roles, status, contact info, and login activity while keeping field roles separate from office/admin access.</p>
                  </div>
                </div>
              </div>
              <div className="co-employees-filter-console">
                <div className="co-employees-access-tabs">
                  {accessFilters.map((item) => (
                    <button key={item.label} type="button" className={item.active ? "is-active" : ""} onClick={item.action}>{item.label}</button>
                  ))}
                </div>
                <input className="field-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email, phone, role..." />
              </div>
              <details className="co-employees-advanced-filters border-b border-slate-200 bg-white">
                <summary>
                  <span>Role and status filters</span>
                  <span>{filter} / {statusFilter}</span>
                </summary>
                <div className="co-office-filter-grid co-employees-filter-grid grid gap-3 p-3 md:grid-cols-2">
                  <SelectField label="Role" value={filter} onChange={(event) => setFilter(event.target.value)}>
                    <option>All roles</option>
                    <option>Office roles</option>
                    <option>Field roles</option>
                    {USER_ROLE_OPTIONS.map((role) => <option key={role} value={role}>{role}</option>)}
                  </SelectField>
                  <SelectField label="Status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                    <option>All statuses</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </SelectField>
                </div>
              </details>
              {busy && visibleRows.length === 0 ? (
                <div className="p-5"><StateCard title="Loading users" description="Pulling employee and office accounts for this workspace." /></div>
              ) : errorMessage && visibleRows.length === 0 ? (
                <div className="p-5"><StateCard title="Users unavailable" description={errorMessage} tone="red" /></div>
              ) : visibleRows.length === 0 ? (
                <div className="p-5"><StateCard title={users.length === 0 ? "No users yet" : "No users match these filters"} description={users.length === 0 ? "Create the first office, foreman, or employee login to power assignments." : "Clear a role, status, or search filter to find another account."} /></div>
              ) : (
                <EmployeesTablePolished
                  rows={visibleRows}
                  selectedId={selectedUserId}
                  onSelect={onSelectUser}
                  onOpenDetails={(id) => openUserTools(id, "details")}
                  canManage={canManage}
                  mobileMaxRows={showAllMobileRows ? null : 2}
                  mobileExpanded={showAllMobileRows}
                  onToggleMobileRows={() => setShowAllMobileRows((current) => !current)}
                />
              )}
              <div className="co-employees-board-footer flex min-w-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3">
                <p className="text-sm font-bold text-slate-600">Showing {visibleRows.length} user{visibleRows.length === 1 ? "" : "s"} / {activeUsers.length} active login{activeUsers.length === 1 ? "" : "s"}</p>
                <Button type="button" size="sm" variant="secondary" onClick={clearFilters}>Clear filters</Button>
              </div>
            </Card>

            <details
              ref={toolsRef}
              className="co-employees-tools-drawer w-full min-w-0 pb-24 md:pb-4"
              open={showTools}
              onToggle={(event) => setShowTools(event.currentTarget.open)}
            >
              <summary>
                <span>
                  <strong>User Tools</strong>
                  <em>Create logins and review role assignments without changing the existing permission model.</em>
                </span>
                <span>Open tools</span>
              </summary>
              <div className="co-employees-tool-tabs mt-3 flex min-w-0 gap-2 overflow-x-auto pb-1">
                {canManage ? <button type="button" className={toolTab === "create" ? "is-active" : ""} onClick={() => setToolTab("create")}><Icon name="plus" />New User</button> : null}
                <button type="button" className={toolTab === "details" ? "is-active" : ""} onClick={() => setToolTab("details")}><Icon name="users" />Details</button>
              </div>
              <div className="co-employees-tools-panel mt-3">
                {toolTab === "create" ? (
                  <UserCreatePanelPolished draft={createDraft} setDraft={setCreateDraft} onCreateUser={onCreateUser} disabled={busy || !canManage} provisionedNotice={provisionedNotice} roleOptions={roleOptionsForManager} onDismissProvisionNotice={onDismissProvisionNotice} />
                ) : (
                  <UserDetailPanelPolished user={selectedUser} draft={userDraft} setDraft={setUserDraft} onSaveUser={onSaveUser} onResendInvite={onResendUserInvite} busy={busy} canManage={canManage} notFound={notFound} roleOptions={editRoleOptions} currentUserIsOwner={currentUserIsOwner} provisionedNotice={provisionedNotice} onDismissProvisionNotice={onDismissProvisionNotice} />
                )}
              </div>
            </details>
          </div>

          <EmployeesCommandRailPolished user={selectedUser} canManage={canManage} busy={busy} onOpenTool={openTools} />
        </div>
      </DesktopCommandWorkspaceFrame>
    </div>
  );
}

export function EmployeesPage(props) {
  return <EmployeesPagePolished {...props} />;
}

function EmployeesPageLegacy({
  users,
  filter,
  setFilter,
  statusFilter,
  setStatusFilter,
  search,
  setSearch,
  selectedUserId,
  onSelectUser,
  selectedUser,
  userDraft,
  setUserDraft,
  createDraft,
  setCreateDraft,
  onCreateUser,
  onSaveUser,
  busy,
  errorMessage,
  permissions,
  provisionedNotice,
}) {
  const canManage = permissions.users.canManage;
  const listState = useMemo(() => deriveUserListState(users, {
    query: search,
    role: filter,
    status: statusFilter,
  }), [filter, search, statusFilter, users]);
  const visibleRows = listState.filteredUsers;
  const notFound = Boolean(selectedUserId) && !selectedUser;
  const employeeKpis = [
    { label: "Visible Users", value: visibleRows.length, helper: "Matching current filters", icon: "users" },
    { label: "Active", value: visibleRows.filter((entry) => entry.status === "active").length, helper: "Can sign in now", icon: "check" },
    { label: "Foremen", value: visibleRows.filter((entry) => entry.role === "Foreman").length, helper: "Field crew leads", icon: "hardhat" },
    { label: "Office Roles", value: visibleRows.filter((entry) => ["Administrator", "Operations Manager", "Estimator"].includes(entry.role)).length, helper: "Office/admin access", icon: "settings" },
  ];

  return (
    <div>
      <PageHeader eyebrow="Office" title="Employees" description="Create and manage office, foreman, and employee logins so crew assignments stay usable." actions={<Badge tone="blue">{visibleRows.length} users</Badge>} />
      <ModuleKpiStrip items={employeeKpis} />
      <div className="grid min-w-0 gap-4 px-5 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <Card className="overflow-hidden">
          <FilterBar filters={["All roles", ...USER_ROLE_OPTIONS]} active={filter} setActive={setFilter} search={search} setSearch={setSearch} placeholder="Search name, email, phone..." />
          <div className="border-b border-blue-100 bg-blue-50/40 p-3">
            <SelectField label="Status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option>All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </SelectField>
          </div>
          {busy && visibleRows.length === 0 ? (
            <div className="p-5"><StateCard title="Loading users" description="Pulling employee and office accounts for this workspace." /></div>
          ) : errorMessage && visibleRows.length === 0 ? (
            <div className="p-5"><StateCard title="Users unavailable" description={errorMessage} tone="red" /></div>
          ) : visibleRows.length === 0 ? (
            <div className="p-5"><StateCard title="No users yet" description="Create the first foreman or employee login to power assignments." /></div>
          ) : (
            <UsersTable rows={visibleRows} selectedId={selectedUserId} onSelect={onSelectUser} />
          )}
        </Card>
        <div className="min-w-0 space-y-4">
          <UserCreateCard draft={createDraft} setDraft={setCreateDraft} onCreateUser={onCreateUser} disabled={busy || !canManage} provisionedNotice={provisionedNotice} />
          <UserDetailPanel user={selectedUser} draft={userDraft} setDraft={setUserDraft} onSaveUser={onSaveUser} busy={busy} canManage={canManage} notFound={notFound} />
        </div>
      </div>
    </div>
  );
}
