import { useEffect, useMemo, useRef, useState } from "react";

import { updateNotificationState } from "./api";
import { Badge, Button, Icon } from "./app-shell-components";
import { todayDateInputValue } from "./app-format-utils";
import { APP_NAME, DEFAULT_LOGO_INITIALS, sanitizeLogoInitials } from "./brand-utils";
import {
  buildNotificationStateStorageKey,
  canViewNotificationCenter,
  deriveNotificationCenterState,
  extractNotificationStateForCompany,
  filterNotificationItems,
  normalizeNotificationState,
  notificationActionLabel,
  notificationSeverityTone,
  notificationTriggerLabel,
  NOTIFICATION_CENTER_FILTERS,
} from "./notification-center-utils";
import {
  loadNotificationState,
  notificationStateTimestamp,
  upsertNotificationItemMeta,
} from "./notification-state-utils";

export function TopBar({ active, setActive, stats, user, onLogout, syncing, saveSummary, navItems, permissions, companyName, companies = [], currentCompanyId = "", onSelectCompany, notificationSource = {}, onOpenPath, sessionToken = "", logoInitials = DEFAULT_LOGO_INITIALS, assistantState = null, onOpenAssistant = null, brandAssets = {}, appName = APP_NAME }) {
  void logoInitials;
  const current = navItems.find((item) => item.id === active);
  const canSwitchCompanies = Boolean(permissions?.companies?.canSwitch && companies.length > 1);
  const userInitials = sanitizeLogoInitials((user?.name || "User").split(/\s+/).map((part) => part[0] || "").join("")) || "U";
  const [mobileAccountOpen, setMobileAccountOpen] = useState(false);
  const canOpenAssistant = Boolean(assistantState?.canView || navItems.some((item) => item.id === "copilot"));
  const canOpenSettings = navItems.some((item) => item.id === "settings");
  const canOpenSupport = navItems.some((item) => item.id === "support");
  const assistantAttentionCount = (assistantState?.watchtowerQueue?.length || 0) + (assistantState?.watchtowerActions?.length || 0);
  const assistantBadge = assistantAttentionCount > 9 ? "9+" : String(assistantAttentionCount || "");
  const assistantStatusLabel = assistantState?.statusLabel || "Review tools";

  useEffect(() => {
    setMobileAccountOpen(false);
  }, [active, currentCompanyId]);

  function openMobileAccountModule(moduleId) {
    setMobileAccountOpen(false);
    setActive(moduleId);
  }

  function handleMobileLogout() {
    setMobileAccountOpen(false);
    onLogout();
  }

  function handleOpenAssistant() {
    setMobileAccountOpen(false);
    if (assistantState?.canView && typeof onOpenAssistant === "function") {
      onOpenAssistant();
      return;
    }
    setActive("copilot");
  }

  return (
    <div className="co-topbar sticky top-0 z-30">
      <div className="flex min-h-16 flex-col justify-center gap-3 px-4 py-3 sm:px-6 lg:h-[4.5rem] lg:flex-row lg:items-center lg:justify-between lg:px-8 lg:py-0">
        <div className="co-mobile-appbar md:hidden">
          <div className="co-mobile-brand-lockup min-w-0">
            <img className="co-mobile-brand-logo" src={brandAssets.appLogo} alt={appName} />
          </div>
          <div className="co-mobile-user-cluster">
            <NotificationCenterButton
              source={notificationSource}
              permissions={permissions}
              user={user}
              companyId={currentCompanyId}
              sessionToken={sessionToken}
              onOpenModule={setActive}
              onOpenPath={onOpenPath}
            />
            {canOpenAssistant ? (
              <button type="button" className="co-mobile-assistant-button co-focus-ring" onClick={handleOpenAssistant} aria-label={`Open Apex Assistant, ${assistantStatusLabel}`}>
                <span className="co-mobile-assistant-mark" aria-hidden="true">
                  <img src={brandAssets.appMark} alt="" />
                </span>
                {assistantBadge ? <span className="co-mobile-assistant-count">{assistantBadge}</span> : null}
              </button>
            ) : null}
            <button
              type="button"
              className="co-mobile-user-button"
              onClick={() => setMobileAccountOpen((currentOpen) => !currentOpen)}
              aria-label="Open account menu"
              aria-expanded={mobileAccountOpen}
            >
              <span className="co-mobile-user-avatar">{userInitials}</span>
              <span className="co-mobile-user-copy">
                <span>{user?.name || "User"}</span>
                <span>{user?.role || "Team"}</span>
              </span>
              <span className="co-mobile-account-word">Account</span>
              <span className="co-mobile-user-chevron" aria-hidden="true">{mobileAccountOpen ? "^" : "v"}</span>
            </button>
            {mobileAccountOpen ? (
              <div className="co-mobile-account-popover" role="dialog" aria-label="Mobile account menu">
                <div className="co-mobile-account-card">
                  <div className="co-mobile-account-head">
                    <span className="co-mobile-user-avatar">{userInitials}</span>
                    <span>
                      <strong>{user?.name || "User"}</strong>
                      <em>{user?.role || "Team"}</em>
                    </span>
                  </div>
                  <div className="co-mobile-account-meta">
                    <span>{companyName || appName}</span>
                    <span>{current?.label || "Workspace"}</span>
                  </div>
                  <div className="co-mobile-account-actions">
                    {canOpenAssistant ? (
                      <button type="button" onClick={() => openMobileAccountModule("copilot")}>
                        <Icon name="spark" className="h-4 w-4" />
                        <span>Assistant</span>
                      </button>
                    ) : null}
                    {canOpenSettings ? (
                      <button type="button" onClick={() => openMobileAccountModule("settings")}>
                        <Icon name="settings" className="h-4 w-4" />
                        <span>Settings</span>
                      </button>
                    ) : null}
                    {canOpenSupport ? (
                      <button type="button" onClick={() => openMobileAccountModule("support")}>
                        <Icon name="phone" className="h-4 w-4" />
                        <span>Support</span>
                      </button>
                    ) : null}
                    <button type="button" className="co-mobile-account-logout" onClick={handleMobileLogout}>
                      <Icon name="arrowUpRight" className="h-4 w-4" />
                      <span>Log out</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
      </div>
        <div className="hidden min-w-0 md:block">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-orange-200">{companyName || appName}</p>
          <p className="truncate text-base font-black text-white">{current?.label || "Dashboard"}</p>
        </div>
        <div className="co-topbar-actions hidden items-center gap-2 md:flex">
          <NotificationCenterButton
            source={notificationSource}
            permissions={permissions}
            user={user}
            companyId={currentCompanyId}
            sessionToken={sessionToken}
            onOpenModule={setActive}
            onOpenPath={onOpenPath}
          />
          {canOpenAssistant ? (
            <button type="button" className="co-topbar-assistant-button co-focus-ring" onClick={handleOpenAssistant} aria-label={`Open Apex Assistant, ${assistantStatusLabel}`}>
              <span className="co-topbar-assistant-mark" aria-hidden="true">
                <img src={brandAssets.appMark} alt="" />
              </span>
              <span className="co-topbar-assistant-copy">
                <strong>Assistant</strong>
                <em>{assistantStatusLabel}</em>
              </span>
              {assistantBadge ? <span className="co-topbar-assistant-count">{assistantBadge}</span> : null}
            </button>
          ) : null}
          {saveSummary ? <Badge tone={saveSummary.tone}>{saveSummary.label}</Badge> : null}
          {permissions?.leads?.canView ? <Badge tone="blue">{stats.newLeads} new leads</Badge> : null}
          <Badge tone="amber">{stats.reportsDue} reports due</Badge>
          {canSwitchCompanies ? (
            <label className="co-topbar-pill flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-orange-200">
              Company
              <select
                value={currentCompanyId}
                onChange={(event) => onSelectCompany?.(event.target.value)}
                disabled={syncing}
                className="max-w-[220px] bg-transparent text-xs font-black normal-case tracking-normal text-white outline-none"
              >
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <div className="co-topbar-pill co-topbar-user-pill rounded-full px-3 py-2 text-xs font-black text-slate-100">{user?.name || "User"}</div>
          <Button className="co-topbar-logout" variant="ghost" size="sm" onClick={onLogout}>
            Log out
          </Button>
        </div>
        {canSwitchCompanies ? (
          <div className="co-mobile-select-tray grid gap-2 md:hidden">
            <select
              value={currentCompanyId}
              onChange={(event) => onSelectCompany?.(event.target.value)}
              disabled={syncing}
              className="co-mobile-select field-input w-full min-w-0 py-2 text-xs font-black text-orange-700"
            >
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>
      {syncing ? <div className="h-1 bg-gradient-to-r from-orange-200 via-orange-600 to-slate-200" /> : null}
    </div>
  );
}

export function NotificationCenterButton({ source = {}, permissions = {}, user = null, companyId = "", sessionToken = "", onOpenModule = () => {}, onOpenPath = null }) {
  const canView = canViewNotificationCenter(permissions);
  const storageKey = buildNotificationStateStorageKey({ companyId, userId: user?.id });
  const serverStateForCompany = useMemo(() => extractNotificationStateForCompany(user?.notificationState, companyId), [companyId, user?.notificationState]);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("unread");
  const [localState, setLocalState] = useState(() => loadNotificationState(storageKey, serverStateForCompany));
  const localStateRef = useRef(localState);
  const notificationState = useMemo(() => deriveNotificationCenterState(source, {
    today: todayDateInputValue(),
    companyId,
    permissions,
    user,
    state: localState,
  }), [companyId, localState, permissions, source, user]);
  const visibleItems = useMemo(() => filterNotificationItems(notificationState.items, { filter }), [filter, notificationState.items]);

  useEffect(() => {
    const nextState = loadNotificationState(storageKey, serverStateForCompany);
    localStateRef.current = nextState;
    setLocalState(nextState);
    setFilter("unread");
    setOpen(false);
    if (sessionToken && notificationStateTimestamp(nextState) > notificationStateTimestamp(serverStateForCompany)) {
      void updateNotificationState(sessionToken, {
        companyId,
        notificationState: nextState,
      }).catch(() => {});
    }
  }, [companyId, serverStateForCompany, sessionToken, storageKey]);

  useEffect(() => {
    localStateRef.current = localState;
  }, [localState]);

  if (!canView) return null;

  function persistNotificationState(updater) {
    const current = normalizeNotificationState(localStateRef.current);
    const draft = typeof updater === "function" ? updater(current) : updater;
    const updatedAt = new Date().toISOString();
    const next = normalizeNotificationState({
      ...draft,
      itemMeta: upsertNotificationItemMeta(notificationState.items, draft, updatedAt),
      updatedAt,
    });
    localStateRef.current = next;
    setLocalState(next);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // Local notification read/archive state is nice-to-have only.
    }
    if (sessionToken) {
      void updateNotificationState(sessionToken, {
        companyId,
        notificationState: next,
      }).catch(() => {});
    }
  }

  function markRead(id) {
    persistNotificationState((current) => ({
      ...current,
      readIds: Array.from(new Set([...current.readIds, id])),
    }));
  }

  function markUnread(id) {
    persistNotificationState((current) => ({
      ...current,
      readIds: current.readIds.filter((entry) => entry !== id),
    }));
  }

  function archiveNotification(id) {
    persistNotificationState((current) => ({
      ...current,
      readIds: Array.from(new Set([...current.readIds, id])),
      archivedIds: Array.from(new Set([...current.archivedIds, id])),
    }));
  }

  function unarchiveNotification(id) {
    persistNotificationState((current) => ({
      ...current,
      archivedIds: current.archivedIds.filter((entry) => entry !== id),
    }));
  }

  function markAllRead() {
    const activeIds = notificationState.items.filter((item) => !item.archived).map((item) => item.id);
    persistNotificationState((current) => ({
      ...current,
      readIds: Array.from(new Set([...current.readIds, ...activeIds])),
    }));
  }

  function clearRead() {
    const readActiveIds = notificationState.items.filter((item) => item.read && !item.archived).map((item) => item.id);
    persistNotificationState((current) => ({
      ...current,
      archivedIds: Array.from(new Set([...current.archivedIds, ...readActiveIds])),
    }));
  }

  function openNotification(item) {
    markRead(item.id);
    if (item.openPath && onOpenPath) {
      onOpenPath(item.openPath);
    } else if (item.moduleId) {
      onOpenModule(item.moduleId);
    }
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        className={`relative inline-flex h-10 w-10 items-center justify-center rounded-full border text-sm font-black transition ${notificationState.stats.unread > 0 ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100" : "border-blue-100 bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-700"}`}
        onClick={() => setOpen((current) => !current)}
        aria-label={`Open notifications${notificationState.stats.unread > 0 ? `, ${notificationState.stats.unread} unread` : ""}`}
        aria-expanded={open}
      >
        <Icon name="bell" className="h-4 w-4" />
        {notificationState.stats.unread > 0 ? (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] leading-none text-white">
            {notificationState.stats.unread > 99 ? "99+" : notificationState.stats.unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="co-mobile-popover absolute right-0 top-full z-50 mt-3 w-[min(92vw,440px)] overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-panel">
          <div className="co-mobile-popover-header border-b border-blue-100 bg-blue-50/70 p-4">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-base font-black text-slate-950">Notifications</p>
                <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
                  In-app work alerts only. Nothing is pushed, emailed, texted, or automated.
                </p>
              </div>
              <Badge tone={notificationState.stats.unread > 0 ? "amber" : "slate"}>{notificationState.stats.unread} unread</Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {NOTIFICATION_CENTER_FILTERS.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setFilter(entry.id)}
                  className={`co-mobile-filter-pill rounded-full px-3 py-1.5 text-xs font-black transition ${filter === entry.id ? "bg-blue-700 text-white" : "bg-white text-slate-600 ring-1 ring-blue-100 hover:bg-blue-50"}`}
                >
                  {entry.label}
                </button>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={markAllRead} disabled={notificationState.stats.unread === 0}>Mark all read</Button>
              <Button type="button" size="sm" variant="ghost" onClick={clearRead} disabled={!notificationState.items.some((item) => item.read && !item.archived)}>Clear read</Button>
            </div>
          </div>

          <div className="max-h-[70vh] overflow-y-auto p-3">
            {visibleItems.length > 0 ? visibleItems.slice(0, 12).map((item) => (
              <div key={item.id} className={`co-mobile-record-card mb-3 rounded-2xl border p-3 last:mb-0 ${item.read ? "border-blue-100 bg-white" : "border-amber-100 bg-amber-50/50"}`}>
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <Badge tone={notificationSeverityTone(item.severity)}>{item.severity}</Badge>
                      <Badge tone="blue">Triggered by: {notificationTriggerLabel(item.type)}</Badge>
                      <Badge tone="slate">{item.dueLabel || "Needs review"}</Badge>
                    </div>
                    <p className="mt-2 break-words text-sm font-black text-slate-950">{item.title}</p>
                    <p className="mt-1 break-words text-xs font-bold leading-5 text-slate-600">{item.description}</p>
                  </div>
                  {item.read ? <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-slate-300" /> : <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-500" />}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" size="sm" onClick={() => openNotification(item)}>{notificationActionLabel(item)}</Button>
                  {item.read ? (
                    <Button type="button" size="sm" variant="ghost" onClick={() => markUnread(item.id)}>Mark unread</Button>
                  ) : (
                    <Button type="button" size="sm" variant="ghost" onClick={() => markRead(item.id)}>Mark read</Button>
                  )}
                  {item.archived ? (
                    <Button type="button" size="sm" variant="secondary" onClick={() => unarchiveNotification(item.id)}>Unarchive</Button>
                  ) : (
                    <Button type="button" size="sm" variant="secondary" onClick={() => archiveNotification(item.id)}>Archive</Button>
                  )}
                </div>
              </div>
            )) : (
              <div className="co-mobile-empty rounded-2xl border border-blue-100 bg-slate-50 p-4 text-center">
                <p className="text-sm font-black text-slate-950">{filter === "archived" ? "No archived notifications" : filter === "all" ? "No active notifications" : "No unread notifications"}</p>
                <p className="mt-1 text-xs font-bold leading-5 text-slate-500">Follow-ups, source checks, missing reports, photo gaps, tickets, checklists, and safety reminders will appear here when they need attention.</p>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
