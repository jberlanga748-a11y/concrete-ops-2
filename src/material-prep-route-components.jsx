import { useMemo, useState } from "react";

import { DEFAULT_APP_PERMISSIONS } from "./app-state-utils";
import { ApexOfficeCommandShell, Card, CommandPageFrame, SectionHeader, StateCard } from "./app-shell-components";
import { buildMaterialPrepChecklist, buildMaterialPrepCopyText, buildMaterialPrepPrintPacket, deriveMaterialPrepState } from "./material-prep-utils";
import { openPrintDocument } from "./print-packets";

export function MaterialPrepPage({
  estimates = [],
  jobs = [],
  customers = [],
  rateBookItems = [],
  permissions = DEFAULT_APP_PERMISSIONS,
  companyName = "Apex HQ Workspace",
  companyProfile = {},
  setActive,
}) {
  const materialPrepState = useMemo(
    () => deriveMaterialPrepState({ estimates, jobs, customers, rateBookItems }),
    [customers, estimates, jobs, rateBookItems],
  );
  const [selectedId, setSelectedId] = useState("");
  const [copyNotice, setCopyNotice] = useState("");
  const selectedQueueItem = materialPrepState.queue.find((item) => item.id === selectedId) || materialPrepState.queue[0] || null;
  const selectedPacket = selectedQueueItem?.packet || null;
  const selectedChecklist = selectedPacket ? buildMaterialPrepChecklist(selectedPacket) : [];
  const canView = Boolean(permissions?.materialPrep?.canView);

  if (!canView) {
    return (
      <CommandPageFrame>
        <StateCard title="Material prep is office-only" description="Field users, estimators, and unauthorized roles cannot access purchasing preparation." tone="amber" />
      </CommandPageFrame>
    );
  }

  const assistantActions = [
    { label: "Copy packet", icon: "quote", onClick: () => handleCopyMaterialPrepPacket(), disabled: !selectedPacket },
    { label: "Print packet", icon: "document", onClick: () => handlePrintMaterialPrepPacket(), disabled: !selectedPacket },
    { label: "Open jobs", icon: "briefcase", onClick: () => setActive?.("jobs") },
  ];

  async function handleCopyMaterialPrepPacket() {
    if (!selectedPacket) return false;
    const copyText = buildMaterialPrepCopyText(selectedPacket, { companyName });
    if (!copyText) return false;
    try {
      await navigator.clipboard.writeText(copyText);
      setCopyNotice("Material prep packet copied for manual review. No vendor message was sent.");
      return true;
    } catch {
      setCopyNotice("Copy was blocked by the browser. Select and copy the packet text manually.");
      return false;
    }
  }

  function handlePrintMaterialPrepPacket() {
    if (!selectedPacket) return false;
    const packet = buildMaterialPrepPrintPacket(selectedPacket, { companyName, companyProfile });
    const opened = openPrintDocument(packet);
    if (!opened) {
      setCopyNotice("Print window was blocked. No vendor message, order, or payment was created.");
    }
    return opened;
  }

  const quickActions = [
    { label: "Copy Packet", icon: "quote", onClick: handleCopyMaterialPrepPacket, disabled: !selectedPacket },
    { label: "Print Packet", icon: "document", onClick: handlePrintMaterialPrepPacket, disabled: !selectedPacket },
    { label: "Rate Book", icon: "calculator", onClick: () => setActive?.("rateBook") },
  ];

  const fallbackAssistantActions = [
    { label: "Open estimates", icon: "quote", onClick: () => setActive?.("estimates") },
    { label: "Open jobs", icon: "briefcase", onClick: () => setActive?.("jobs") },
    { label: "Review rate book", icon: "calculator", onClick: () => setActive?.("rateBook") },
  ];

  return (
    <ApexOfficeCommandShell
      eyebrow="Build 4A"
      title="Material Prep"
      description="Review approved estimate scope, linked jobs, vendor notes, and field delivery needs without ordering, payment, or supplier messages."
      className="co-material-prep-shell"
      kpis={materialPrepState.kpis}
      queue={{
        title: "Approved scope queue",
        description: "Max 7 estimates ready or blocked for purchasing prep.",
        items: materialPrepState.queue,
        selectedId: selectedQueueItem?.id || "",
        onSelect: (item) => setSelectedId(item.id),
        emptyState: <StateCard title="No approved scope yet" description="Approved estimates with linked jobs will appear here for purchasing prep review." tone="slate" />,
      }}
      detail={{
        title: "Prep packet",
        item: selectedQueueItem,
        emptyState: <StateCard title="No packet selected" description="Choose an approved estimate to review material, vendor, and delivery context." tone="slate" />,
      }}
      assistant={{
        title: "Purchasing Guardrails",
        description: "Review-only prep. Apex HQ will not order materials, contact vendors, create purchase orders, or move money from this screen.",
        priorities: [
          { label: "Ready packets", value: materialPrepState.readyPackets.length, tone: "green" },
          { label: "Needs review", value: materialPrepState.blockedPackets.length, tone: materialPrepState.blockedPackets.length ? "amber" : "green" },
        ],
        actions: selectedPacket ? assistantActions : fallbackAssistantActions,
        guardrails: [
          "No vendor order or supplier send.",
          "No payment, purchase order, or billing action.",
          "No field exposure to office pricing, cost, or margin.",
        ],
      }}
      quickActions={quickActions}
    >
      {selectedPacket ? (
        <div className="co-material-prep-detail">
          {copyNotice ? <div className="co-material-prep-copy-notice">{copyNotice}</div> : null}
          <div className="co-material-prep-summary">
            <div>
              <span>Customer</span>
              <strong>{selectedPacket.customerName}</strong>
            </div>
            <div>
              <span>Linked job</span>
              <strong>{selectedPacket.jobTitle}</strong>
            </div>
            <div>
              <span>Prep rows</span>
              <strong>{selectedPacket.counts.total}</strong>
            </div>
          </div>

          {selectedPacket.blockers.length ? (
            <Card className="co-material-prep-warning">
              <strong>Needs review before purchasing prep</strong>
              <ul>
                {selectedPacket.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
              </ul>
            </Card>
          ) : null}

          <Card className="co-material-prep-card">
            <SectionHeader title="Material / vendor prep" description="Quantities and notes are review-only and exclude price, cost, markup, margin, and internal backup text." />
            <div className="co-material-prep-row-list">
              {selectedPacket.rows.length ? selectedPacket.rows.map((row) => (
                <div key={row.id} className="co-material-prep-row" data-category={row.category}>
                  <div>
                    <span>{row.category}</span>
                    <strong>{row.description}</strong>
                    <em>{row.quantityLabel}</em>
                  </div>
                  <p>{row.vendorNote}</p>
                </div>
              )) : (
                <StateCard title="No prep rows" description="Add reviewed estimate line items or takeoff quantities before preparing purchasing context." tone="slate" />
              )}
            </div>
          </Card>

          <Card className="co-material-prep-card">
            <SectionHeader title="Field delivery needs" description="Copy-safe internal checklist for staging, delivery timing, and received quantity review. No external sends." />
            <ul className="co-material-prep-checklist">
              {selectedPacket.fieldNeeds.length ? selectedPacket.fieldNeeds.map((need) => <li key={need}>{need}</li>) : <li>No field delivery needs derived yet.</li>}
            </ul>
          </Card>

          <Card className="co-material-prep-card">
            <SectionHeader title="Manual prep checklist" description="Owner/admin review steps only. Vendor contact, orders, purchase orders, and payments stay outside Apex HQ." />
            <ul className="co-material-prep-checklist">
              {selectedChecklist.map((item) => (
                <li key={item.id}>
                  <strong>{item.label}</strong>
                  <span>{item.detail}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      ) : null}
    </ApexOfficeCommandShell>
  );
}
