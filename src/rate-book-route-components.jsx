import { useEffect, useMemo, useState } from "react";

import {
  ApexOfficeCommandShell,
  Badge,
  Button,
  Card,
  CommandPageFrame,
  InputField,
  PageHeader,
  SectionHeader,
  SelectField,
  StatCard,
  StateCard,
  StatusBadge,
  TextAreaField,
} from "./app-shell-components";
import { formatEstimateCurrency } from "./estimate-utils";
import {
  RATE_BOOK_CATEGORIES,
  RATE_BOOK_CATEGORY_LABELS,
  calculateRateBookUnitPrice,
  createRateBookDraft,
  deriveRateBookState,
  normalizeRateBookCategory,
  validateRateBookDraft,
} from "./rate-book-utils";

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

export function RateBookPage({
  rateBookItems = [],
  permissions = {},
  busy = false,
  onCreateRateBookItem,
  onUpdateRateBookItem,
  onArchiveRateBookItem,
  onRestoreRateBookItem,
  setActive,
}) {
  const [draft, setDraft] = useState(createRateBookDraft());
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [validationErrors, setValidationErrors] = useState([]);
  const canUseRateBookShell = useDesktopCommandViewport(1180);
  const canManage = Boolean(permissions?.rateBook?.canManage);
  const rateBookState = useMemo(() => deriveRateBookState(rateBookItems), [rateBookItems]);
  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    const rows = showArchived ? rateBookState.rows : rateBookState.activeItems;
    return rows.filter((item) => {
      const matchesCategory = categoryFilter === "all" || normalizeRateBookCategory(item.category) === categoryFilter;
      const haystack = [
        item.title,
        item.trade,
        item.description,
        item.unit,
        RATE_BOOK_CATEGORY_LABELS[normalizeRateBookCategory(item.category)],
      ].filter(Boolean).join(" ").toLowerCase();
      return matchesCategory && (!query || haystack.includes(query));
    });
  }, [categoryFilter, rateBookState.activeItems, rateBookState.rows, search, showArchived]);
  const selectedExisting = draft.id ? rateBookItems.find((item) => item.id === draft.id) : null;
  const previewUnitPrice = calculateRateBookUnitPrice(draft);
  const selectedRateBookShellItem = selectedExisting
    ? {
      id: selectedExisting.id,
      kind: "existing",
      item: selectedExisting,
      title: selectedExisting.title,
      statusLabel: selectedExisting.archivedAt || selectedExisting.status === "archived" ? "Archived" : "Active",
    }
    : {
      id: "rate-book-new",
      kind: "new",
      title: "New default",
      statusLabel: "Draft",
    };
  const rateBookShellQueue = [
    {
      id: "rate-book-new",
      kind: "new",
      eyebrow: "Create",
      title: "New rate default",
      meta: "Add labor, material, equipment, subcontractor, or other pricing basis.",
      statusLabel: "Draft",
      tone: "blue",
      actionLabel: "Create",
    },
    ...visibleItems.map((item) => ({
      id: item.id,
      kind: "existing",
      item,
      eyebrow: RATE_BOOK_CATEGORY_LABELS[normalizeRateBookCategory(item.category)] || "Other",
      title: item.title,
      meta: `${item.trade || "General"} / ${item.unit || "ea"}`,
      statusLabel: item.archivedAt || item.status === "archived" ? "Archived" : "Active",
      status: item.archivedAt || item.status === "archived" ? "Archived" : "Active",
      tone: item.archivedAt || item.status === "archived" ? "slate" : "green",
      actionLabel: "Edit",
      badges: [
        { label: `${formatEstimateCurrency(calculateRateBookUnitPrice(item))}/${item.unit || "ea"}`, tone: "orange" },
      ],
    })),
  ];
  const rateBookCategoryTabs = [
    { id: "all", label: "All" },
    ...RATE_BOOK_CATEGORIES.map((category) => ({ id: category, label: RATE_BOOK_CATEGORY_LABELS[category] })),
  ];
  const rateBookShellKpis = [
    { id: "active", label: "Active Defaults", value: rateBookState.counts.active, helper: "Usable in estimate pricing", icon: "check", tone: rateBookState.counts.active ? "green" : "slate" },
    { id: "labor", label: "Labor", value: rateBookState.counts.labor, helper: "Crew and install basis", icon: "hardhat", tone: rateBookState.counts.labor ? "orange" : "slate", onClick: () => setCategoryFilter("labor") },
    { id: "materials", label: "Materials", value: rateBookState.counts.material, helper: "Concrete and supplies", icon: "clipboard", tone: rateBookState.counts.material ? "blue" : "slate", onClick: () => setCategoryFilter("material") },
    { id: "subs-equipment", label: "Subs / Equipment", value: rateBookState.counts.subcontractor + rateBookState.counts.equipment, helper: "Rental and partner defaults", icon: "briefcase", tone: rateBookState.counts.subcontractor + rateBookState.counts.equipment ? "amber" : "slate" },
  ];

  function selectRateBookShellItem(item) {
    if (item?.kind === "new") {
      setDraft(createRateBookDraft());
      setValidationErrors([]);
      return;
    }
    if (item?.item) editItem(item.item);
  }

  function editItem(item) {
    setDraft(createRateBookDraft(item));
    setValidationErrors([]);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canManage) return;
    const validation = validateRateBookDraft(draft);
    if (!validation.ok) {
      setValidationErrors(validation.errors);
      return;
    }
    const saved = selectedExisting
      ? await onUpdateRateBookItem?.(selectedExisting.id, validation.normalized)
      : await onCreateRateBookItem?.(validation.normalized);
    if (saved) {
      setDraft(createRateBookDraft());
      setValidationErrors([]);
    }
  }

  function renderRateBookEditor() {
    return (
      <>
        <SectionHeader
          title={selectedExisting ? "Edit Default" : "New Default"}
          description="Costs and markup stay internal. Estimate line items receive only the reviewed sell price."
          action={selectedExisting ? <StatusBadge status={selectedExisting.archivedAt ? "Archived" : "Active"} /> : <Badge tone="blue">Draft</Badge>}
        />
        <form className="co-rate-book-form" onSubmit={handleSubmit}>
          <div className="co-rate-book-form-grid">
            <SelectField label="Category" value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))} disabled={!canManage || busy}>
              {RATE_BOOK_CATEGORIES.map((category) => <option key={category} value={category}>{RATE_BOOK_CATEGORY_LABELS[category]}</option>)}
            </SelectField>
            <InputField label="Trade" value={draft.trade} onChange={(event) => setDraft((current) => ({ ...current, trade: event.target.value }))} placeholder="concrete, fencing, general" disabled={!canManage || busy} />
            <InputField label="Title" value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} disabled={!canManage || busy} />
            <InputField label="Unit" value={draft.unit} onChange={(event) => setDraft((current) => ({ ...current, unit: event.target.value }))} disabled={!canManage || busy} />
            <InputField label="Unit cost" value={draft.unitCost} inputMode="decimal" onChange={(event) => setDraft((current) => ({ ...current, unitCost: event.target.value, unitPrice: "" }))} disabled={!canManage || busy} />
            <InputField label="Markup %" value={draft.markupPercent} inputMode="decimal" onChange={(event) => setDraft((current) => ({ ...current, markupPercent: event.target.value, unitPrice: "" }))} disabled={!canManage || busy} />
            <InputField label="Sell unit price" value={draft.unitPrice} inputMode="decimal" onChange={(event) => setDraft((current) => ({ ...current, unitPrice: event.target.value }))} disabled={!canManage || busy} />
            <SelectField label="Taxable" value={draft.taxable ? "yes" : "no"} onChange={(event) => setDraft((current) => ({ ...current, taxable: event.target.value === "yes" }))} disabled={!canManage || busy}>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </SelectField>
          </div>
          <TextAreaField label="Estimate description" value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} disabled={!canManage || busy} />
          <div className="co-rate-book-preview">
            <span><em>Internal basis</em><strong>{formatEstimateCurrency(draft.unitCost)} + {Number(draft.markupPercent || 0)}%</strong></span>
            <span><em>Estimate default</em><strong>{formatEstimateCurrency(previewUnitPrice)}/{draft.unit || "ea"}</strong></span>
          </div>
          {validationErrors.length ? (
            <div className="co-rate-book-errors">
              {validationErrors.map((error) => <span key={error}>{error}</span>)}
            </div>
          ) : null}
          <div className="co-rate-book-actions">
            <Button type="submit" disabled={!canManage || busy}>{selectedExisting ? "Save Default" : "Create Default"}</Button>
            <Button type="button" variant="secondary" onClick={() => setDraft(createRateBookDraft())} disabled={busy}>Clear</Button>
            {selectedExisting && !selectedExisting.archivedAt ? (
              <Button type="button" variant="secondary" onClick={() => onArchiveRateBookItem?.(selectedExisting.id)} disabled={!canManage || busy}>Archive</Button>
            ) : null}
            {selectedExisting?.archivedAt ? (
              <Button type="button" variant="secondary" onClick={() => onRestoreRateBookItem?.(selectedExisting.id)} disabled={!canManage || busy}>Restore</Button>
            ) : null}
          </div>
        </form>
      </>
    );
  }

  if (canUseRateBookShell) {
    return (
      <div className="co-office-page co-rate-book-page co-rate-book-shell-page">
        <ApexOfficeCommandShell
          eyebrow="Pricing Control"
          title="Rate Book"
          description="Office-only defaults for reviewed estimate pricing. Raw cost, markup, and internal pricing basis stay out of field and customer surfaces."
          className="co-rate-book-command-shell"
          kpis={rateBookShellKpis}
          queue={{
            title: "Rate default queue",
            description: `${visibleItems.length} visible default${visibleItems.length === 1 ? "" : "s"}. Search or filter before editing.`,
            items: rateBookShellQueue,
            selectedId: selectedRateBookShellItem.id,
            onSelect: selectRateBookShellItem,
            limit: 6,
            controls: (
              <div className="co-rate-book-filter-console">
                <div className="co-rate-book-category-tabs">
                  {rateBookCategoryTabs.map((item) => (
                    <button key={item.id} type="button" className={categoryFilter === item.id ? "is-active" : ""} onClick={() => setCategoryFilter(item.id)}>
                      {item.label}
                    </button>
                  ))}
                </div>
                <input className="field-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search defaults..." />
                <Button type="button" size="sm" variant="secondary" onClick={() => setShowArchived((value) => !value)}>{showArchived ? "Hide archived" : "Show archived"}</Button>
              </div>
            ),
            emptyState: <StateCard title="No rate defaults match" description="Clear search or category filters to find another pricing default." tone="slate" />,
          }}
          detail={{
            title: selectedExisting ? "Selected default" : "New default",
            item: selectedRateBookShellItem,
            emptyState: <StateCard title="No rate default selected" description="Choose a rate default or create a new one." tone="slate" />,
          }}
          quickActions={[
            { id: "new-default", label: "New Default", icon: "plus", onClick: () => selectRateBookShellItem({ kind: "new" }) },
            { id: "archive-toggle", label: showArchived ? "Hide Archived" : "Show Archived", icon: "archive", onClick: () => setShowArchived((value) => !value) },
            { id: "open-estimates", label: "Estimates", icon: "quote", onClick: () => setActive?.("estimates") },
          ]}
        >
          <div className="co-rate-book-shell-detail-scroll">
            <Card className="co-rate-book-editor-card">
              {renderRateBookEditor()}
            </Card>
          </div>
        </ApexOfficeCommandShell>
      </div>
    );
  }

  return (
    <div className="co-office-page co-rate-book-legacy-page">
      <PageHeader
        eyebrow="Build 3B"
        title="Rate Book"
        description="Company-standard internal defaults for labor, material, equipment, subcontractor, and markup pricing. Field users and customer packets never receive raw cost or margin data."
        actions={(
          <>
            <Button type="button" variant="secondary" onClick={() => setActive?.("estimates")}>Open Estimates</Button>
            <Button type="button" onClick={() => setDraft(createRateBookDraft())}>New Default</Button>
          </>
        )}
      />
      <CommandPageFrame>
      <div className="co-rate-book-page">
        <div className="co-rate-book-kpis">
          <StatCard title="Active Defaults" value={rateBookState.counts.active} />
          <StatCard title="Labor" value={rateBookState.counts.labor} />
          <StatCard title="Materials" value={rateBookState.counts.material} />
          <StatCard title="Subs / Equipment" value={rateBookState.counts.subcontractor + rateBookState.counts.equipment} />
        </div>

        <div className="co-rate-book-layout">
          <Card className="co-rate-book-list-card">
            <SectionHeader
              title="Company Defaults"
              description="Internal library rows. Applying one to an estimate copies only description, unit, and customer unit price."
              action={<Button type="button" size="sm" variant="secondary" onClick={() => setShowArchived((value) => !value)}>{showArchived ? "Hide archived" : "Show archived"}</Button>}
            />
            <div className="co-rate-book-list">
              {visibleItems.length ? visibleItems.map((item) => (
                <button key={item.id} type="button" className={`co-rate-book-row ${draft.id === item.id ? "is-selected" : ""}`} onClick={() => editItem(item)}>
                  <span>
                    <strong>{item.title}</strong>
                    <em>{RATE_BOOK_CATEGORY_LABELS[item.category] || "Other"}{item.trade ? ` / ${item.trade}` : ""}</em>
                  </span>
                  <span>
                    <strong>{formatEstimateCurrency(calculateRateBookUnitPrice(item))}/{item.unit || "ea"}</strong>
                    <em>{item.archivedAt || item.status === "archived" ? "Archived" : "Active"}</em>
                  </span>
                </button>
              )) : (
                <div className="co-rate-book-empty">
                  <strong>No rate book defaults yet.</strong>
                  <span>Add the first internal default to speed up reviewed estimate pricing.</span>
                </div>
              )}
            </div>
          </Card>

          <Card className="co-rate-book-editor-card">
            {renderRateBookEditor()}
          </Card>
        </div>
      </div>
      </CommandPageFrame>
    </div>
  );
}
