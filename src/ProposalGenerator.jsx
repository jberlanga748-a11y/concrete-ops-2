import { useEffect, useMemo, useState } from "react";

import {
  APEX_BRAND_ASSETS,
  deriveLogoInitialsFromCompanyName,
  sanitizeLogoInitials,
} from "./brand-utils";
import {
  DEFAULT_SCOPE_TEMPLATES,
  APEX_HQ_PROPOSAL_COMPANY_DEFAULTS,
  LINE_ITEM_UNITS,
  PROJECT_CATEGORIES,
  PROPOSAL_COMPANY_STORAGE_KEY,
  PROPOSAL_STATUSES,
  PROPOSAL_STORAGE_KEY,
  PROPOSAL_TYPES,
  addDaysInputDate,
  calculateProposalLineTotal,
  concreteSpecRows,
  createBlankProposal,
  createLineItem,
  createPhotoSlot,
  createScopeSection,
  createSeedProposal,
  duplicateProposal,
  filterProposals,
  formatCurrency,
  formatDate,
  hasConcreteSpecs,
  normalizeProposal,
  proposalIntroCopy,
  proposalStatusLabel,
  proposalTypeLabel,
  validateProposal,
} from "./proposal-utils";

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function loadCompanyDefaults() {
  if (typeof window === "undefined") return APEX_HQ_PROPOSAL_COMPANY_DEFAULTS;
  const saved = safeJsonParse(window.localStorage.getItem(PROPOSAL_COMPANY_STORAGE_KEY), null);
  return {
    ...APEX_HQ_PROPOSAL_COMPANY_DEFAULTS,
    ...(saved && typeof saved === "object" ? saved : {}),
  };
}

function loadStoredProposals(companyDefaults) {
  if (typeof window === "undefined") return [createSeedProposal(companyDefaults)];
  const saved = safeJsonParse(window.localStorage.getItem(PROPOSAL_STORAGE_KEY), null);
  if (Array.isArray(saved) && saved.length > 0) {
    return saved.map((proposal) => normalizeProposal(proposal, companyDefaults));
  }
  return [createSeedProposal(companyDefaults)];
}

function saveJson(key, value) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function classNames(...parts) {
  return parts.filter(Boolean).join(" ");
}

function proposalCompanyInitials(company = {}) {
  return sanitizeLogoInitials(company.logoInitials)
    || sanitizeLogoInitials(deriveLogoInitialsFromCompanyName(company.companyName))
    || "CO";
}

function isApexProposalCompany(company = {}) {
  return /\bapex\s*hq\b/i.test(String(company.companyName || ""));
}

function ProposalBrandMark({ company = {}, className = "" }) {
  const imageSource = company.logoDataUrl || company.logoImageUrl || "";
  if (imageSource) {
    return <img src={imageSource} alt={`${company.companyName || "Company"} logo`} className={classNames("h-full w-full object-contain", className)} />;
  }
  if (isApexProposalCompany(company)) {
    return <img src={APEX_BRAND_ASSETS.appMark} alt="Apex HQ" className={classNames("h-full w-full object-contain", className)} />;
  }
  return <span className="text-center text-sm font-black tracking-[0.08em]">{proposalCompanyInitials(company)}</span>;
}

function splitLines(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function joinLines(value) {
  return Array.isArray(value) ? value.join("\n") : "";
}

function moveArrayItem(items, index, direction) {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(index, 1);
  next.splice(nextIndex, 0, item);
  return next;
}

function renumberLineItems(items) {
  return items.map((item, index) => ({ ...item, itemNumber: String(index + 1) }));
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Upload could not be read."));
    reader.readAsDataURL(file);
  });
}

function booleanToSelect(value) {
  if (value === true) return "true";
  if (value === false) return "false";
  return "";
}

function selectToBoolean(value) {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

function Icon({ name, className = "h-4 w-4" }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
    "aria-hidden": "true",
  };
  const paths = {
    plus: [<path key="1" d="M12 5v14" />, <path key="2" d="M5 12h14" />],
    save: [<path key="1" d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />, <path key="2" d="M17 21v-8H7v8" />, <path key="3" d="M7 3v5h8" />],
    print: [<path key="1" d="M6 9V3h12v6" />, <path key="2" d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />, <path key="3" d="M6 14h12v7H6z" />],
    copy: [<path key="1" d="M8 8h12v12H8z" />, <path key="2" d="M4 16V4h12" />],
    edit: [<path key="1" d="M12 20h9" />, <path key="2" d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />],
    search: [<circle key="1" cx="11" cy="11" r="7" />, <path key="2" d="m20 20-3.5-3.5" />],
    check: [<path key="1" d="m5 13 4 4L19 7" />],
    x: [<path key="1" d="M18 6 6 18" />, <path key="2" d="m6 6 12 12" />],
    arrowUp: [<path key="1" d="m18 15-6-6-6 6" />],
    arrowDown: [<path key="1" d="m6 9 6 6 6-6" />],
    upload: [<path key="1" d="M12 16V4" />, <path key="2" d="m7 9 5-5 5 5" />, <path key="3" d="M20 16v4H4v-4" />],
    file: [<path key="1" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />, <path key="2" d="M14 2v6h6" />],
    eye: [<path key="1" d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />, <circle key="2" cx="12" cy="12" r="3" />],
  };

  return <svg {...common}>{paths[name] || paths.file}</svg>;
}

function ProposalButton({ children, variant = "primary", size = "md", icon, className = "", ...props }) {
  const variants = {
    primary: "bg-[#062B45] text-white hover:bg-[#041D2F] shadow-sm shadow-[#062B45]/20",
    secondary: "border border-[#D9DEE5] bg-white text-[#111827] hover:bg-[#F4F5F6]",
    gold: "bg-[#C9A64A] text-[#041D2F] hover:bg-[#b79538]",
    ghost: "text-[#5B6470] hover:bg-[#F4F5F6] hover:text-[#111827]",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };
  const sizes = {
    sm: "px-3 py-2 text-xs",
    md: "px-4 py-2.5 text-sm",
    lg: "px-5 py-3 text-sm",
  };

  return (
    <button
      type="button"
      className={classNames(
        "inline-flex min-w-0 items-center justify-center gap-2 rounded-lg font-black leading-tight transition disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant] || variants.primary,
        sizes[size] || sizes.md,
        className,
      )}
      {...props}
    >
      {icon ? <Icon name={icon} /> : null}
      <span className="min-w-0 break-words">{children}</span>
    </button>
  );
}

function ProposalCard({ children, className = "" }) {
  return <section className={classNames("rounded-lg border border-[#D9DEE5] bg-white shadow-sm", className)}>{children}</section>;
}

function Field({ label, className = "", ...props }) {
  return (
    <label className={classNames("grid min-w-0 gap-1 text-sm font-bold text-[#111827]", className)}>
      <span>{label}</span>
      <input
        className="block w-full min-w-0 rounded-lg border border-[#D9DEE5] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none transition placeholder:text-[#8A939F] focus:border-[#062B45] focus:ring-2 focus:ring-[#062B45]/10"
        {...props}
      />
    </label>
  );
}

function TextArea({ label, className = "", rows = 4, ...props }) {
  return (
    <label className={classNames("grid min-w-0 gap-1 text-sm font-bold text-[#111827]", className)}>
      <span>{label}</span>
      <textarea
        rows={rows}
        className="block w-full min-w-0 rounded-lg border border-[#D9DEE5] bg-white px-3 py-2.5 text-sm leading-6 text-[#111827] outline-none transition placeholder:text-[#8A939F] focus:border-[#062B45] focus:ring-2 focus:ring-[#062B45]/10"
        {...props}
      />
    </label>
  );
}

function Select({ label, children, className = "", ...props }) {
  return (
    <label className={classNames("grid min-w-0 gap-1 text-sm font-bold text-[#111827]", className)}>
      <span>{label}</span>
      <select
        className="block w-full min-w-0 rounded-lg border border-[#D9DEE5] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none transition focus:border-[#062B45] focus:ring-2 focus:ring-[#062B45]/10"
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

function ToggleField({ label, checked, onChange }) {
  return (
    <label className="flex min-w-0 items-center gap-2 rounded-lg border border-[#D9DEE5] bg-white px-3 py-2.5 text-sm font-bold text-[#111827]">
      <input
        type="checkbox"
        checked={Boolean(checked)}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-[#D9DEE5] text-[#062B45] focus:ring-[#062B45]"
      />
      <span className="min-w-0 break-words">{label}</span>
    </label>
  );
}

function SectionTitle({ eyebrow, title, action }) {
  return (
    <div className="mb-4 flex min-w-0 flex-col gap-3 border-b border-[#D9DEE5] pb-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#C9A64A]">{eyebrow}</p> : null}
        <h2 className="text-lg font-black text-[#111827]">{title}</h2>
      </div>
      {action ? <div className="flex min-w-0 flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}

function StatusPill({ status }) {
  const label = proposalStatusLabel(status);
  const tone = {
    Draft: "bg-[#F4F5F6] text-[#5B6470] ring-[#D9DEE5]",
    Sent: "bg-blue-50 text-blue-700 ring-blue-100",
    Approved: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    Rejected: "bg-red-50 text-red-700 ring-red-100",
    Expired: "bg-amber-50 text-amber-700 ring-amber-100",
  }[label] || "bg-[#F4F5F6] text-[#5B6470] ring-[#D9DEE5]";

  return <span className={classNames("inline-flex rounded-full px-2.5 py-1 text-xs font-black ring-1", tone)}>{label}</span>;
}

function UploadSlot({ label, value, onChange, shape = "wide" }) {
  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    onChange(dataUrl);
  }

  return (
    <div className="grid min-w-0 gap-2">
      <p className="text-sm font-bold text-[#111827]">{label}</p>
      <div
        className={classNames(
          "flex min-h-32 min-w-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-[#AAB3BE] bg-[#F4F5F6] text-center",
          shape === "square" ? "aspect-square" : "aspect-[16/9]",
        )}
      >
        {value ? (
          <img src={value} alt={label} className="h-full w-full object-cover" />
        ) : (
          <div className="p-4 text-sm font-bold text-[#5B6470]">
            <Icon name="upload" className="mx-auto h-5 w-5" />
            <span className="mt-2 block">Upload slot</span>
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#D9DEE5] bg-white px-3 py-2 text-xs font-black text-[#111827] hover:bg-[#F4F5F6]">
          <Icon name="upload" className="h-3.5 w-3.5" />
          <span>Choose file</span>
          <input type="file" accept="image/*" className="sr-only" onChange={handleFileChange} />
        </label>
        {value ? (
          <ProposalButton variant="ghost" size="sm" icon="x" onClick={() => onChange("")}>
            Clear
          </ProposalButton>
        ) : null}
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-lg border border-[#D9DEE5] bg-[#F4F5F6] p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#5B6470]">{label}</p>
      <p className="mt-1 break-words text-lg font-black text-[#111827]">{value}</p>
    </div>
  );
}

function CompanyDefaultsEditor({ companyDefaults, onChange }) {
  function update(patch) {
    onChange({ ...companyDefaults, ...patch });
  }

  return (
    <ProposalCard className="p-4">
      <SectionTitle eyebrow="Brand defaults" title="Company Proposal Profile" />
      <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Company name" value={companyDefaults.companyName} onChange={(event) => update({ companyName: event.target.value })} />
          <Field label="Phone" value={companyDefaults.phone} onChange={(event) => update({ phone: event.target.value })} />
          <Field label="Email" value={companyDefaults.email} onChange={(event) => update({ email: event.target.value })} />
          <Field label="Location / market" value={companyDefaults.location} onChange={(event) => update({ location: event.target.value })} />
          <Field label="CCB" value={companyDefaults.ccb} onChange={(event) => update({ ccb: event.target.value })} />
          <Field label="License text" value={companyDefaults.licenseText} onChange={(event) => update({ licenseText: event.target.value })} />
          <Field label="Service area" value={companyDefaults.serviceArea} onChange={(event) => update({ serviceArea: event.target.value })} className="md:col-span-2" />
          <Select label="Tagline" value={companyDefaults.tagline} onChange={(event) => update({ tagline: event.target.value })}>
            {[
              "Clear scopes. Clean handoffs. Work won with confidence.",
              "Professional concrete scopes, pricing, and proof-ready closeout.",
              "Built for clean bids, organized crews, and accountable delivery.",
            ].map((tagline) => <option key={tagline}>{tagline}</option>)}
          </Select>
          <Field
            label="Default expiration days"
            type="number"
            min="1"
            value={companyDefaults.defaultExpirationDays}
            onChange={(event) => update({ defaultExpirationDays: event.target.value })}
          />
          <TextArea label="Default payment terms" value={companyDefaults.defaultPaymentTerms} onChange={(event) => update({ defaultPaymentTerms: event.target.value })} className="md:col-span-2" />
          <TextArea label="Default exclusions" value={joinLines(companyDefaults.defaultExclusions)} onChange={(event) => update({ defaultExclusions: splitLines(event.target.value) })} className="md:col-span-2" />
          <TextArea label="Default warranty note" value={companyDefaults.defaultWarrantyNote} onChange={(event) => update({ defaultWarrantyNote: event.target.value })} className="md:col-span-2" />
          <TextArea label="Default signature block" value={companyDefaults.defaultSignatureBlock} onChange={(event) => update({ defaultSignatureBlock: event.target.value })} className="md:col-span-2" />
        </div>
        <div className="grid content-start gap-4">
          <UploadSlot label="Logo upload" value={companyDefaults.logoDataUrl} onChange={(logoDataUrl) => update({ logoDataUrl })} shape="square" />
          <UploadSlot label="Badge upload" value={companyDefaults.badgeDataUrl} onChange={(badgeDataUrl) => update({ badgeDataUrl })} shape="square" />
        </div>
      </div>
    </ProposalCard>
  );
}

function ClientProjectEditor({ draft, setDraft }) {
  const updateClient = (patch) => setDraft((current) => ({ ...current, client: { ...current.client, ...patch } }));
  const updateProject = (patch) => setDraft((current) => ({ ...current, project: { ...current.project, ...patch } }));

  return (
    <ProposalCard className="p-4">
      <SectionTitle eyebrow="Project setup" title="Client, Contractor & Project" />
      <div className="grid gap-5">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Select label="Proposal type" value={draft.proposalType} onChange={(event) => setDraft((current) => ({ ...current, proposalType: event.target.value }))}>
            {PROPOSAL_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
          <Field label="Proposal date" type="date" value={draft.proposalDate} onChange={(event) => setDraft((current) => ({ ...current, proposalDate: event.target.value }))} />
          <Field label="Expiration date" type="date" value={draft.expirationDate} onChange={(event) => setDraft((current) => ({ ...current, expirationDate: event.target.value }))} />
          <Select label="Status" value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}>
            {PROPOSAL_STATUSES.map((status) => <option key={status} value={status}>{proposalStatusLabel(status)}</option>)}
          </Select>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Client/company name" value={draft.client.companyName} onChange={(event) => updateClient({ companyName: event.target.value })} />
          <Field label="Contact name" value={draft.client.contactName} onChange={(event) => updateClient({ contactName: event.target.value })} />
          <Field label="Contact phone" value={draft.client.phone} onChange={(event) => updateClient({ phone: event.target.value })} />
          <Field label="Contact email" value={draft.client.email} onChange={(event) => updateClient({ email: event.target.value })} />
          <TextArea label="Billing address" value={draft.client.billingAddress} onChange={(event) => updateClient({ billingAddress: event.target.value })} rows={3} />
          <TextArea label="Project address" value={draft.client.projectAddress} onChange={(event) => updateClient({ projectAddress: event.target.value })} rows={3} />
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <Field label="Project name" value={draft.project.name} onChange={(event) => updateProject({ name: event.target.value })} />
          <Field label="Project location" value={draft.project.location} onChange={(event) => updateProject({ location: event.target.value })} />
          <Select label="Project category" value={draft.project.category} onChange={(event) => updateProject({ category: event.target.value })}>
            {PROJECT_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
          </Select>
          <Field label="Estimated start date" type="date" value={draft.project.estimatedStartDate} onChange={(event) => updateProject({ estimatedStartDate: event.target.value })} />
          <Field label="Estimated duration" value={draft.project.estimatedDuration} onChange={(event) => updateProject({ estimatedDuration: event.target.value })} />
          <Field label="Work hours / restrictions" value={draft.project.scheduleRestrictions} onChange={(event) => updateProject({ scheduleRestrictions: event.target.value })} />
          <TextArea label="Project description" value={draft.project.description} onChange={(event) => updateProject({ description: event.target.value })} className="md:col-span-2 lg:col-span-3" />
          <TextArea label="Access notes" value={draft.project.accessNotes} onChange={(event) => updateProject({ accessNotes: event.target.value })} />
          <TextArea label="Site condition notes" value={draft.project.siteConditionNotes} onChange={(event) => updateProject({ siteConditionNotes: event.target.value })} />
          <TextArea label="Special requirements" value={draft.project.specialRequirements} onChange={(event) => updateProject({ specialRequirements: event.target.value })} />
        </div>
      </div>
    </ProposalCard>
  );
}

function ConcreteSpecsEditor({ draft, setDraft }) {
  const specs = draft.concreteSpecs || {};
  const update = (patch) => setDraft((current) => ({ ...current, concreteSpecs: { ...current.concreteSpecs, ...patch } }));

  return (
    <ProposalCard className="p-4">
      <SectionTitle eyebrow="Concrete specs" title="Concrete-Specific Details" />
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <Field label="Estimated square feet" type="number" min="0" value={specs.squareFeet} onChange={(event) => update({ squareFeet: event.target.value })} />
        <Field label="Estimated cubic yards" type="number" min="0" step="0.01" value={specs.cubicYards} onChange={(event) => update({ cubicYards: event.target.value })} />
        <Field label="Thickness" type="number" min="0" step="0.25" value={specs.thicknessInches} onChange={(event) => update({ thicknessInches: event.target.value })} />
        <Field label="PSI" value={specs.psi} onChange={(event) => update({ psi: event.target.value })} />
        <Field label="Slump" value={specs.slump} onChange={(event) => update({ slump: event.target.value })} />
        <Field label="Air entrainment" value={specs.airEntrapment} onChange={(event) => update({ airEntrapment: event.target.value })} />
        <Select label="Fiber mesh" value={booleanToSelect(specs.fiberMesh)} onChange={(event) => update({ fiberMesh: selectToBoolean(event.target.value) })}>
          <option value="">Not specified</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </Select>
        <Field label="Rebar/mesh details" value={specs.reinforcement} onChange={(event) => update({ reinforcement: event.target.value })} />
        <Field label="Finish type" value={specs.finishType} onChange={(event) => update({ finishType: event.target.value })} />
        <Field label="Control joint spacing" value={specs.controlJointSpacing} onChange={(event) => update({ controlJointSpacing: event.target.value })} />
        <Field label="Saw cut timing" value={specs.sawCutTiming} onChange={(event) => update({ sawCutTiming: event.target.value })} />
        <Field label="Concrete supplier" value={specs.supplier} onChange={(event) => update({ supplier: event.target.value })} />
        <Select label="Pump required" value={booleanToSelect(specs.pumpRequired)} onChange={(event) => update({ pumpRequired: selectToBoolean(event.target.value) })}>
          <option value="">Not specified</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </Select>
        <TextArea label="Cure/sealer notes" value={specs.cureSealerNotes} onChange={(event) => update({ cureSealerNotes: event.target.value })} />
        <TextArea label="Truck access notes" value={specs.truckAccessNotes} onChange={(event) => update({ truckAccessNotes: event.target.value })} />
      </div>
    </ProposalCard>
  );
}

function GcPrimeEditor({ draft, setDraft }) {
  if (draft.proposalType !== "gc_prime") return null;
  const gc = draft.gcPrime || {};
  const update = (patch) => setDraft((current) => ({ ...current, gcPrime: { ...current.gcPrime, ...patch } }));

  return (
    <ProposalCard className="p-4">
      <SectionTitle eyebrow="GC / Prime addendum" title="Bid Package & Contract Notes" />
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <Field label="GC / prime contractor name" value={gc.contractorName} onChange={(event) => update({ contractorName: event.target.value })} />
        <Field label="Project manager name" value={gc.projectManagerName} onChange={(event) => update({ projectManagerName: event.target.value })} />
        <Field label="Project manager phone" value={gc.projectManagerPhone} onChange={(event) => update({ projectManagerPhone: event.target.value })} />
        <Field label="Project manager email" value={gc.projectManagerEmail} onChange={(event) => update({ projectManagerEmail: event.target.value })} />
        <Field label="Bid package number" value={gc.bidPackageNumber} onChange={(event) => update({ bidPackageNumber: event.target.value })} />
        <Field label="Spec section" value={gc.specSection} onChange={(event) => update({ specSection: event.target.value })} />
        <Field label="Retainage percentage" type="number" min="0" step="0.1" value={gc.retainagePercent} onChange={(event) => update({ retainagePercent: event.target.value })} />
        <TextArea label="Drawing references" value={gc.drawingReferences} onChange={(event) => update({ drawingReferences: event.target.value })} className="md:col-span-2" />
        <TextArea label="Addenda acknowledged" value={joinLines(gc.addendaAcknowledged)} onChange={(event) => update({ addendaAcknowledged: splitLines(event.target.value) })} />
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
        <ToggleField label="Prevailing wage required" checked={gc.prevailingWageRequired} onChange={(value) => update({ prevailingWageRequired: value })} />
        <ToggleField label="Certified wage reporting required" checked={gc.certifiedPayrollRequired} onChange={(value) => update({ certifiedPayrollRequired: value })} />
        <ToggleField label="Insurance certificate required" checked={gc.insuranceCertificateRequired} onChange={(value) => update({ insuranceCertificateRequired: value })} />
        <ToggleField label="W-9 required" checked={gc.w9Required} onChange={(value) => update({ w9Required: value })} />
        <ToggleField label="Safety orientation required" checked={gc.safetyOrientationRequired} onChange={(value) => update({ safetyOrientationRequired: value })} />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <TextArea label="Jobsite access / badging requirements" value={gc.jobsiteAccessRequirements} onChange={(event) => update({ jobsiteAccessRequirements: event.target.value })} />
        <TextArea label="Payment application terms" value={gc.paymentApplicationTerms} onChange={(event) => update({ paymentApplicationTerms: event.target.value })} />
        <TextArea label="Change order process" value={gc.changeOrderProcess} onChange={(event) => update({ changeOrderProcess: event.target.value })} />
        <TextArea label="RFI / clarification notes" value={gc.rfiNotes} onChange={(event) => update({ rfiNotes: event.target.value })} />
      </div>
    </ProposalCard>
  );
}

function ScopeSectionEditor({ draft, setDraft }) {
  const [templateIndex, setTemplateIndex] = useState("0");

  function updateSection(index, patch) {
    setDraft((current) => ({
      ...current,
      scopeSections: current.scopeSections.map((section, sectionIndex) => (
        sectionIndex === index ? { ...section, ...patch } : section
      )),
    }));
  }

  function addTemplate() {
    const template = DEFAULT_SCOPE_TEMPLATES[Number(templateIndex)] || DEFAULT_SCOPE_TEMPLATES[0];
    setDraft((current) => ({
      ...current,
      scopeSections: [...current.scopeSections, createScopeSection(template)],
    }));
  }

  function addBlank() {
    setDraft((current) => ({
      ...current,
      scopeSections: [...current.scopeSections, createScopeSection({ title: "Additional Scope", body: "", bullets: [] })],
    }));
  }

  function remove(index) {
    setDraft((current) => ({
      ...current,
      scopeSections: current.scopeSections.filter((_, sectionIndex) => sectionIndex !== index),
    }));
  }

  function move(index, direction) {
    setDraft((current) => ({
      ...current,
      scopeSections: moveArrayItem(current.scopeSections, index, direction),
    }));
  }

  return (
    <ProposalCard className="p-4">
      <SectionTitle
        eyebrow="Scope builder"
        title="Scope of Work"
        action={(
          <>
            <Select label="Template" value={templateIndex} onChange={(event) => setTemplateIndex(event.target.value)} className="w-64">
              {DEFAULT_SCOPE_TEMPLATES.map((template, index) => <option key={template.title} value={index}>{template.title}</option>)}
            </Select>
            <ProposalButton icon="plus" variant="secondary" onClick={addTemplate}>Add template</ProposalButton>
            <ProposalButton icon="plus" variant="secondary" onClick={addBlank}>Add blank</ProposalButton>
          </>
        )}
      />
      <div className="grid gap-4">
        {draft.scopeSections.map((section, index) => (
          <div key={section.id} className="rounded-lg border border-[#D9DEE5] bg-[#F4F5F6] p-3">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
              <Field label={`Section ${index + 1} title`} value={section.title} onChange={(event) => updateSection(index, { title: event.target.value })} />
              <div className="flex items-end gap-2">
                <ProposalButton variant="ghost" size="sm" icon="arrowUp" onClick={() => move(index, -1)} aria-label="Move scope section up" />
                <ProposalButton variant="ghost" size="sm" icon="arrowDown" onClick={() => move(index, 1)} aria-label="Move scope section down" />
                <ProposalButton variant="ghost" size="sm" icon="x" onClick={() => remove(index)} aria-label="Remove scope section" />
              </div>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <TextArea label="Body" value={section.body} onChange={(event) => updateSection(index, { body: event.target.value })} />
              <TextArea label="Bullets" value={joinLines(section.bullets)} onChange={(event) => updateSection(index, { bullets: splitLines(event.target.value) })} />
            </div>
          </div>
        ))}
      </div>
    </ProposalCard>
  );
}

function LineItemsTable({ draft, setDraft }) {
  const normalized = normalizeProposal(draft);

  function updateItem(index, patch) {
    setDraft((current) => ({
      ...current,
      lineItems: current.lineItems.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
    }));
  }

  function addItem() {
    setDraft((current) => ({
      ...current,
      lineItems: renumberLineItems([...current.lineItems, createLineItem({}, current.lineItems.length)]),
    }));
  }

  function removeItem(index) {
    setDraft((current) => {
      const next = current.lineItems.filter((_, itemIndex) => itemIndex !== index);
      return {
        ...current,
        lineItems: renumberLineItems(next.length > 0 ? next : [createLineItem()]),
      };
    });
  }

  function moveItem(index, direction) {
    setDraft((current) => ({
      ...current,
      lineItems: renumberLineItems(moveArrayItem(current.lineItems, index, direction)),
    }));
  }

  return (
    <ProposalCard className="p-4">
      <SectionTitle eyebrow="Bid schedule" title="Quantity / Line Item Builder" action={<ProposalButton icon="plus" variant="secondary" onClick={addItem}>Add line item</ProposalButton>} />
      <div className="grid gap-3">
        {draft.lineItems.map((item, index) => (
          <div key={item.id} className="rounded-lg border border-[#D9DEE5] bg-[#F4F5F6] p-3">
            <div className="grid gap-3 lg:grid-cols-[64px_minmax(0,1.8fr)_90px_96px_120px_120px_auto]">
              <Field label="Item" value={item.itemNumber || index + 1} onChange={(event) => updateItem(index, { itemNumber: event.target.value })} />
              <Field label="Description" value={item.description} onChange={(event) => updateItem(index, { description: event.target.value })} />
              <Field label="Qty" type="number" min="0" step="0.01" value={item.quantity} onChange={(event) => updateItem(index, { quantity: event.target.value })} />
              <Select label="Unit" value={item.unit} onChange={(event) => updateItem(index, { unit: event.target.value })}>
                {LINE_ITEM_UNITS.map((unit) => <option key={unit}>{unit}</option>)}
              </Select>
              <Field label="Unit price" type="number" min="0" step="0.01" value={item.unitPrice} onChange={(event) => updateItem(index, { unitPrice: event.target.value })} />
              <Field label="Internal cost" type="number" min="0" step="0.01" value={item.internalCost} onChange={(event) => updateItem(index, { internalCost: event.target.value })} />
              <div className="flex items-end gap-2">
                <ProposalButton variant="ghost" size="sm" icon="arrowUp" onClick={() => moveItem(index, -1)} aria-label="Move line item up" />
                <ProposalButton variant="ghost" size="sm" icon="arrowDown" onClick={() => moveItem(index, 1)} aria-label="Move line item down" />
                <ProposalButton variant="ghost" size="sm" icon="x" onClick={() => removeItem(index)} aria-label="Remove line item" />
              </div>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-[1fr_160px_180px] md:items-end">
              <Field label="Notes" value={item.notes} onChange={(event) => updateItem(index, { notes: event.target.value })} />
              <ToggleField label="Taxable" checked={item.taxable} onChange={(value) => updateItem(index, { taxable: value })} />
              <div className="rounded-lg border border-[#D9DEE5] bg-white px-3 py-2.5">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#5B6470]">Line total</p>
                <p className="mt-1 text-lg font-black text-[#111827]">{formatCurrency(calculateProposalLineTotal(item))}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
        <Field label="Tax rate (%)" type="number" min="0" step="0.001" value={draft.taxRate} onChange={(event) => setDraft((current) => ({ ...current, taxRate: event.target.value }))} />
        <Field label="Discount amount" type="number" min="0" step="0.01" value={draft.discountAmount} onChange={(event) => setDraft((current) => ({ ...current, discountAmount: event.target.value }))} />
        <Field label="Deposit amount" type="number" min="0" step="0.01" value={draft.depositAmount} onChange={(event) => setDraft((current) => ({ ...current, depositAmount: event.target.value }))} />
        <Metric label="Subtotal" value={formatCurrency(normalized.subtotal)} />
        <Metric label="Total" value={formatCurrency(normalized.total)} />
      </div>
    </ProposalCard>
  );
}

function TermsEditor({ draft, setDraft }) {
  return (
    <ProposalCard className="p-4">
      <SectionTitle eyebrow="Terms" title="Exclusions, Assumptions & Acceptance" />
      <div className="grid gap-3 md:grid-cols-2">
        <TextArea label="Exclusions / not included" value={joinLines(draft.exclusions)} onChange={(event) => setDraft((current) => ({ ...current, exclusions: splitLines(event.target.value) }))} />
        <TextArea label="Assumptions" value={joinLines(draft.assumptions)} onChange={(event) => setDraft((current) => ({ ...current, assumptions: splitLines(event.target.value) }))} />
        <TextArea label="Terms" value={draft.terms} onChange={(event) => setDraft((current) => ({ ...current, terms: event.target.value }))} />
        <TextArea label="Warranty note" value={draft.warrantyNote} onChange={(event) => setDraft((current) => ({ ...current, warrantyNote: event.target.value }))} />
        <TextArea label="Signature block note" value={draft.signatureNote} onChange={(event) => setDraft((current) => ({ ...current, signatureNote: event.target.value }))} />
        <TextArea label="Internal notes" value={draft.internalNotes} onChange={(event) => setDraft((current) => ({ ...current, internalNotes: event.target.value }))} />
      </div>
    </ProposalCard>
  );
}

function PhotoUploads({ draft, setDraft }) {
  function updatePhoto(index, patch) {
    setDraft((current) => ({
      ...current,
      projectPhotos: current.projectPhotos.map((photo, photoIndex) => photoIndex === index ? { ...photo, ...patch } : photo),
    }));
  }

  function addPhoto() {
    setDraft((current) => ({
      ...current,
      projectPhotos: [...current.projectPhotos, createPhotoSlot({}, current.projectPhotos.length)],
    }));
  }

  function removePhoto(index) {
    setDraft((current) => ({
      ...current,
      projectPhotos: current.projectPhotos.filter((_, photoIndex) => photoIndex !== index),
    }));
  }

  return (
    <ProposalCard className="p-4">
      <SectionTitle eyebrow="Approved visuals" title="Logo, Badge & Project Photo Slots" action={<ProposalButton icon="plus" variant="secondary" onClick={addPhoto}>Add photo slot</ProposalButton>} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {draft.projectPhotos.map((photo, index) => (
          <div key={photo.id} className="rounded-lg border border-[#D9DEE5] bg-[#F4F5F6] p-3">
            <Field label="Photo label" value={photo.label} onChange={(event) => updatePhoto(index, { label: event.target.value })} />
            <div className="mt-3">
              <UploadSlot label="Project photo" value={photo.dataUrl} onChange={(dataUrl) => updatePhoto(index, { dataUrl })} />
            </div>
            <div className="mt-3">
              <ProposalButton variant="ghost" size="sm" icon="x" onClick={() => removePhoto(index)}>Remove slot</ProposalButton>
            </div>
          </div>
        ))}
      </div>
    </ProposalCard>
  );
}

function ProposalForm({ draft, setDraft, companyDefaults, setCompanyDefaults, onSave, onCancel, validation, mode }) {
  const normalizedDraft = useMemo(() => normalizeProposal(draft, companyDefaults), [companyDefaults, draft]);

  function handleCompanyDefaultsChange(nextDefaults) {
    setCompanyDefaults(nextDefaults);
    setDraft((current) => ({
      ...current,
      company: {
        ...(current.company || {}),
        ...nextDefaults,
      },
      expirationDate: current.expirationDate || addDaysInputDate(current.proposalDate, nextDefaults.defaultExpirationDays || 30),
    }));
  }

  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(380px,0.78fr)]">
      <div className="min-w-0 space-y-5">
        <ProposalCard className="overflow-hidden">
          <div className="grid gap-3 border-b border-[#D9DEE5] bg-white p-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#C9A64A]">{mode === "new" ? "New proposal" : "Edit proposal"}</p>
              <h2 className="mt-1 text-2xl font-black text-[#062B45]">{normalizedDraft.project.name || "Customer proposal draft"}</h2>
              <p className="mt-1 text-sm font-bold leading-5 text-[#5B6470]">
                {normalizedDraft.client.companyName || normalizedDraft.client.contactName || "Client pending"} / {formatCurrency(normalizedDraft.total)}
              </p>
            </div>
            <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-[#D9DEE5] text-center text-xs font-black">
              <span className="bg-[#F4F5F6] px-3 py-2 text-[#5B6470]">Brand</span>
              <span className="bg-white px-3 py-2 text-[#5B6470]">Scope</span>
              <span className="bg-[#062B45] px-3 py-2 text-white">Preview</span>
            </div>
          </div>
        </ProposalCard>
        <details className="group rounded-lg border border-[#D9DEE5] bg-white shadow-sm" open>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-black text-[#111827] marker:hidden">
            <span>Client, project, and proposal dates</span>
            <span className="text-xs uppercase tracking-[0.16em] text-[#C9A64A]">Open</span>
          </summary>
          <div className="border-t border-[#D9DEE5] p-4"><ClientProjectEditor draft={draft} setDraft={setDraft} /></div>
        </details>
        <details className="group rounded-lg border border-[#D9DEE5] bg-white shadow-sm" open>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-black text-[#111827] marker:hidden">
            <span>Pricing and line items</span>
            <span className="text-xs uppercase tracking-[0.16em] text-[#C9A64A]">Open</span>
          </summary>
          <div className="border-t border-[#D9DEE5] p-4"><LineItemsTable draft={draft} setDraft={setDraft} /></div>
        </details>
        <details className="group rounded-lg border border-[#D9DEE5] bg-white shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-black text-[#111827] marker:hidden">
            <span>Company branding and defaults</span>
            <span className="text-xs uppercase tracking-[0.16em] text-[#C9A64A]">Open</span>
          </summary>
          <div className="border-t border-[#D9DEE5] p-4"><CompanyDefaultsEditor companyDefaults={companyDefaults} onChange={handleCompanyDefaultsChange} /></div>
        </details>
        <details className="group rounded-lg border border-[#D9DEE5] bg-white shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-black text-[#111827] marker:hidden">
            <span>Scope sections and GC addendum</span>
            <span className="text-xs uppercase tracking-[0.16em] text-[#C9A64A]">Open</span>
          </summary>
          <div className="space-y-4 border-t border-[#D9DEE5] p-4">
            <ScopeSectionEditor draft={draft} setDraft={setDraft} />
            <GcPrimeEditor draft={draft} setDraft={setDraft} />
          </div>
        </details>
        <details className="group rounded-lg border border-[#D9DEE5] bg-white shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-black text-[#111827] marker:hidden">
            <span>Concrete specs, terms, and approved visuals</span>
            <span className="text-xs uppercase tracking-[0.16em] text-[#C9A64A]">Open</span>
          </summary>
          <div className="space-y-4 border-t border-[#D9DEE5] p-4">
            <ConcreteSpecsEditor draft={draft} setDraft={setDraft} />
            <TermsEditor draft={draft} setDraft={setDraft} />
            <PhotoUploads draft={draft} setDraft={setDraft} />
          </div>
        </details>
        {validation?.errors?.length || validation?.warnings?.length ? (
          <ProposalCard className="border-amber-200 bg-amber-50 p-4">
            {validation.errors.length ? (
              <div>
                <p className="font-black text-red-700">Required before saving</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-700">
                  {validation.errors.map((error) => <li key={error}>{error}</li>)}
                </ul>
              </div>
            ) : null}
            {validation.warnings.length ? (
              <div className={validation.errors.length ? "mt-4" : ""}>
                <p className="font-black text-amber-800">Warnings</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-800">
                  {validation.warnings.map((warning) => <li key={warning}>{warning}</li>)}
                </ul>
              </div>
            ) : null}
          </ProposalCard>
        ) : null}
        <div className="proposal-no-print sticky bottom-3 z-10 flex flex-wrap gap-2 rounded-lg border border-[#D9DEE5] bg-white/95 p-3 shadow-lg backdrop-blur">
          <ProposalButton icon="save" onClick={onSave}>{mode === "new" ? "Save draft" : "Save changes"}</ProposalButton>
          <ProposalButton icon="eye" variant="secondary" onClick={() => document.getElementById("proposal-live-preview")?.scrollIntoView({ behavior: "smooth", block: "start" })}>Generate preview</ProposalButton>
          <ProposalButton icon="x" variant="ghost" onClick={onCancel}>Cancel</ProposalButton>
        </div>
      </div>
      <div id="proposal-live-preview" className="min-w-0 xl:sticky xl:top-20 xl:self-start">
        <ProposalCard className="overflow-hidden">
          <div className="border-b border-[#D9DEE5] bg-[#041D2F] px-4 py-3 text-white">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#C9A64A]">Live preview</p>
            <p className="mt-1 text-sm font-bold">{normalizedDraft.proposalNumber} - {formatCurrency(normalizedDraft.total)}</p>
          </div>
          <div className="max-h-[calc(100vh-150px)] overflow-auto bg-[#F4F5F6] p-4">
            <ProposalPrintView proposal={normalizedDraft} compact />
          </div>
        </ProposalCard>
      </div>
    </div>
  );
}

function ProposalHeader({ proposal, compact = false }) {
  const company = proposal.company || APEX_HQ_PROPOSAL_COMPANY_DEFAULTS;
  return (
    <header className={classNames(
      "proposal-section grid gap-5 border-b border-[#D9DEE5] pb-5",
      compact ? "" : "md:grid-cols-[1fr_auto] md:items-start",
    )}>
      <div className="flex min-w-0 gap-4">
        <div className={classNames(
          "flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#D9DEE5] bg-[#F4F5F6] text-center text-sm font-black text-[#062B45]",
          compact ? "h-16 w-16" : "h-20 w-20",
        )}>
          <ProposalBrandMark company={company} className="p-2" />
        </div>
        <div className="min-w-0">
          <p className={classNames(
            "font-black uppercase tracking-[0.08em] text-[#062B45]",
            compact ? "text-xl leading-6" : "text-2xl",
          )}>{company.companyName}</p>
          <p className="mt-1 text-sm font-bold text-[#5B6470]">{company.phone} | {company.email}</p>
          <p className="mt-1 text-sm font-bold text-[#5B6470]">{company.licenseText} | {company.ccb}</p>
          <p className="mt-1 text-sm text-[#5B6470]">{company.serviceArea}</p>
        </div>
      </div>
      <div className="rounded-lg border border-[#D9DEE5] bg-[#F4F5F6] p-4 text-sm">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5B6470]">Proposal</p>
        <p className="mt-1 text-xl font-black text-[#111827]">{proposal.proposalNumber}</p>
        <p className="mt-3"><span className="font-black text-[#111827]">Date:</span> {formatDate(proposal.proposalDate)}</p>
        <p className="mt-1"><span className="font-black text-[#111827]">Expires:</span> {formatDate(proposal.expirationDate)}</p>
      </div>
    </header>
  );
}

function ProposalHero({ proposal, compact = false }) {
  return (
    <section className="proposal-section mt-6 overflow-hidden rounded-lg bg-[#062B45] text-white">
      <div className={classNames(
        "grid gap-5 p-6 md:items-end",
        compact ? "md:grid-cols-1" : "md:grid-cols-[minmax(0,1fr)_minmax(220px,0.52fr)]",
      )}>
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#C9A64A]">{proposalTypeLabel(proposal.proposalType)}</p>
          <h1 className={classNames("mt-2 font-black uppercase tracking-[0.06em]", compact ? "text-3xl" : "text-4xl")}>Concrete Proposal</h1>
          <p className="mt-3 text-lg font-bold text-white/90">{proposal.project.name || "Project name pending"}</p>
          <p className="mt-1 text-sm text-white/75">{proposal.project.location || proposal.client.projectAddress || "Project location pending"}</p>
        </div>
        <div className="min-w-0 rounded-lg border border-white/15 bg-white/10 px-4 py-3 text-sm font-black leading-5 text-white">
          {proposal.company?.tagline || APEX_HQ_PROPOSAL_COMPANY_DEFAULTS.tagline}
        </div>
      </div>
    </section>
  );
}

function PreparedForCard({ proposal }) {
  return (
    <section className="proposal-section mt-6 grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
      <div className="rounded-lg border border-[#D9DEE5] bg-[#F4F5F6] p-4">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#C9A64A]">Prepared For</p>
        <p className="mt-3 text-lg font-black text-[#111827]">{proposal.client.companyName || proposal.client.contactName || "Client pending"}</p>
        {proposal.client.contactName ? <p className="mt-1 text-sm text-[#5B6470]">{proposal.client.contactName}</p> : null}
        {proposal.client.phone ? <p className="mt-1 text-sm text-[#5B6470]">{proposal.client.phone}</p> : null}
        {proposal.client.email ? <p className="mt-1 text-sm text-[#5B6470]">{proposal.client.email}</p> : null}
        {proposal.proposalType === "gc_prime" && proposal.gcPrime.contractorName ? (
          <p className="mt-3 text-sm font-bold text-[#111827]">GC / Prime: {proposal.gcPrime.contractorName}</p>
        ) : null}
      </div>
      <div className="rounded-lg border border-[#D9DEE5] bg-white p-4">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#C9A64A]">Project Summary</p>
        <p className="mt-3 text-sm leading-6 text-[#5B6470]">{proposalIntroCopy(proposal.proposalType)}</p>
        <div className="mt-4 grid gap-2 text-sm md:grid-cols-2">
          <p><span className="font-black text-[#111827]">Address:</span> {proposal.client.projectAddress || proposal.project.location || "Not set"}</p>
          <p><span className="font-black text-[#111827]">Category:</span> {proposal.project.category || "Not set"}</p>
          <p><span className="font-black text-[#111827]">Start:</span> {formatDate(proposal.project.estimatedStartDate)}</p>
          <p><span className="font-black text-[#111827]">Duration:</span> {proposal.project.estimatedDuration || "To be coordinated"}</p>
        </div>
      </div>
    </section>
  );
}

function TrustCards() {
  const cards = [
    "Licensed, Bonded & Insured",
    "Local Oregon concrete expertise",
    "Durable, clean, professional workmanship",
    "Clear communication and jobsite coordination",
    "Residential and commercial concrete experience",
  ];
  return (
    <section className="proposal-section mt-6">
      <h2 className="text-sm font-black uppercase tracking-[0.18em] text-[#062B45]">Why This Contractor</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card) => (
          <div key={card} className="rounded-lg border border-[#D9DEE5] bg-[#F4F5F6] p-3">
            <div className="mb-2 h-1 w-10 rounded-full bg-[#C9A64A]" />
            <p className="text-sm font-black leading-5 text-[#111827]">{card}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function PhotoStrip({ proposal }) {
  const photos = (proposal.projectPhotos || []).filter((photo) => photo.dataUrl);
  if (photos.length === 0) return null;
  return (
    <section className="proposal-section mt-6">
      <h2 className="text-sm font-black uppercase tracking-[0.18em] text-[#062B45]">Project Photos</h2>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        {photos.slice(0, 6).map((photo) => (
          <figure key={photo.id} className="overflow-hidden rounded-lg border border-[#D9DEE5] bg-[#F4F5F6]">
            <img src={photo.dataUrl} alt={photo.label} className="aspect-[4/3] w-full object-cover" />
            <figcaption className="px-3 py-2 text-xs font-bold text-[#5B6470]">{photo.label}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function ScopeSectionPreview({ proposal }) {
  return (
    <section className="proposal-section mt-6">
      <h2 className="text-sm font-black uppercase tracking-[0.18em] text-[#062B45]">Scope of Work</h2>
      <div className="mt-3 grid gap-3">
        {proposal.scopeSections.map((section) => (
          <div key={section.id} className="rounded-lg border border-[#D9DEE5] bg-white p-4">
            <h3 className="text-base font-black text-[#111827]">{section.title || "Scope section"}</h3>
            {section.body ? <p className="mt-2 text-sm leading-6 text-[#5B6470]">{section.body}</p> : null}
            {section.bullets?.length ? (
              <ul className="mt-3 grid gap-1 pl-5 text-sm leading-6 text-[#111827]">
                {section.bullets.map((bullet) => <li key={bullet} className="list-disc">{bullet}</li>)}
              </ul>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function ConcreteSpecsTable({ proposal }) {
  const rows = concreteSpecRows(proposal.concreteSpecs);
  if (rows.length === 0) return null;
  return (
    <section className="proposal-section mt-6">
      <h2 className="text-sm font-black uppercase tracking-[0.18em] text-[#062B45]">Concrete Details</h2>
      <div className="mt-3 overflow-hidden rounded-lg border border-[#D9DEE5]">
        <div className="grid md:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={label} className="grid grid-cols-[0.9fr_1.1fr] border-b border-[#D9DEE5] text-sm last:border-b-0 md:border-r md:even:border-r-0">
              <div className="bg-[#F4F5F6] px-3 py-2 font-black text-[#111827]">{label}</div>
              <div className="px-3 py-2 text-[#5B6470]">{value}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingTable({ proposal }) {
  return (
    <section className="proposal-section mt-6">
      <h2 className="text-sm font-black uppercase tracking-[0.18em] text-[#062B45]">Pricing / Bid Schedule</h2>
      <div className="proposal-pricing mt-3 overflow-hidden rounded-lg border border-[#D9DEE5]">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-[#041D2F] text-white">
            <tr>
              <th className="px-3 py-2 font-black">Item</th>
              <th className="px-3 py-2 font-black">Description</th>
              <th className="px-3 py-2 text-right font-black">Qty</th>
              <th className="px-3 py-2 font-black">Unit</th>
              <th className="px-3 py-2 text-right font-black">Unit Price</th>
              <th className="px-3 py-2 text-right font-black">Total</th>
            </tr>
          </thead>
          <tbody>
            {proposal.lineItems.map((item, index) => (
              <tr key={item.id} className="border-b border-[#D9DEE5] last:border-b-0">
                <td className="px-3 py-2 font-bold text-[#111827]">{item.itemNumber || index + 1}</td>
                <td className="px-3 py-2 text-[#111827]">
                  <p className="font-bold">{item.description || "Line item"}</p>
                  {item.notes ? <p className="mt-1 text-xs text-[#5B6470]">{item.notes}</p> : null}
                </td>
                <td className="px-3 py-2 text-right text-[#5B6470]">{item.quantity}</td>
                <td className="px-3 py-2 text-[#5B6470]">{item.unit}</td>
                <td className="px-3 py-2 text-right text-[#5B6470]">{formatCurrency(item.unitPrice)}</td>
                <td className="px-3 py-2 text-right font-black text-[#111827]">{formatCurrency(calculateProposalLineTotal(item))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="ml-auto mt-4 grid max-w-sm gap-2 text-sm">
        <div className="flex justify-between border-b border-[#D9DEE5] py-1"><span>Subtotal</span><strong>{formatCurrency(proposal.subtotal)}</strong></div>
        {proposal.taxAmount ? <div className="flex justify-between border-b border-[#D9DEE5] py-1"><span>Tax</span><strong>{formatCurrency(proposal.taxAmount)}</strong></div> : null}
        {proposal.discountAmount ? <div className="flex justify-between border-b border-[#D9DEE5] py-1"><span>Discount</span><strong>-{formatCurrency(proposal.discountAmount)}</strong></div> : null}
        <div className="flex justify-between rounded-lg bg-[#062B45] px-3 py-2 text-white"><span className="font-black">Total Proposal Amount</span><strong>{formatCurrency(proposal.total)}</strong></div>
        {proposal.depositAmount ? <div className="flex justify-between border-b border-[#D9DEE5] py-1"><span>Deposit</span><strong>{formatCurrency(proposal.depositAmount)}</strong></div> : null}
        {proposal.depositAmount ? <div className="flex justify-between py-1"><span>Balance due</span><strong>{formatCurrency(proposal.balanceDue)}</strong></div> : null}
      </div>
    </section>
  );
}

function GcPrimeAddendum({ proposal }) {
  if (proposal.proposalType !== "gc_prime") return null;
  const gc = proposal.gcPrime || {};
  const rows = [
    ["Bid package", gc.bidPackageNumber],
    ["Spec section", gc.specSection],
    ["Drawing references", gc.drawingReferences],
    ["Addenda acknowledged", gc.addendaAcknowledged?.join(", ")],
    ["Retainage", gc.retainagePercent !== "" ? `${gc.retainagePercent}%` : ""],
    ["Prevailing wage", gc.prevailingWageRequired ? "Yes" : "No"],
    ["Certified wage reporting", gc.certifiedPayrollRequired ? "Yes" : "No"],
    ["Insurance certificate", gc.insuranceCertificateRequired ? "Yes" : "No"],
    ["W-9", gc.w9Required ? "Yes" : "No"],
    ["Safety orientation", gc.safetyOrientationRequired ? "Yes" : "No"],
    ["Jobsite access / badging", gc.jobsiteAccessRequirements],
    ["Payment application terms", gc.paymentApplicationTerms],
    ["Change order process", gc.changeOrderProcess],
    ["RFI / clarification notes", gc.rfiNotes],
  ].filter(([, value]) => String(value ?? "").trim() !== "");

  return (
    <section className="proposal-section mt-6">
      <h2 className="text-sm font-black uppercase tracking-[0.18em] text-[#062B45]">GC / Prime Notes</h2>
      <div className="mt-3 grid gap-2 rounded-lg border border-[#D9DEE5] bg-[#F4F5F6] p-4 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="grid gap-1 border-b border-[#D9DEE5] pb-2 last:border-b-0 md:grid-cols-[220px_1fr]">
            <p className="font-black text-[#111827]">{label}</p>
            <p className="text-[#5B6470]">{value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ExclusionsTerms({ proposal }) {
  return (
    <section className="proposal-section mt-6 grid gap-4 md:grid-cols-2">
      <div>
        <h2 className="text-sm font-black uppercase tracking-[0.18em] text-[#062B45]">Exclusions / Assumptions</h2>
        <div className="mt-3 rounded-lg border border-[#D9DEE5] bg-[#F4F5F6] p-4">
          <p className="text-sm font-black text-[#111827]">Exclusions</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-[#5B6470]">
            {(proposal.exclusions.length ? proposal.exclusions : ["No exclusions listed."]).map((item) => <li key={item}>{item}</li>)}
          </ul>
          <p className="mt-4 text-sm font-black text-[#111827]">Assumptions</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-[#5B6470]">
            {(proposal.assumptions.length ? proposal.assumptions : ["No assumptions listed."]).map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      </div>
      <div>
        <h2 className="text-sm font-black uppercase tracking-[0.18em] text-[#062B45]">Schedule & Coordination</h2>
        <div className="mt-3 rounded-lg border border-[#D9DEE5] bg-white p-4 text-sm leading-6 text-[#5B6470]">
          <p><span className="font-black text-[#111827]">Estimated start:</span> {formatDate(proposal.project.estimatedStartDate)}</p>
          <p><span className="font-black text-[#111827]">Estimated duration:</span> {proposal.project.estimatedDuration || "To be coordinated"}</p>
          {proposal.project.accessNotes ? <p className="mt-2"><span className="font-black text-[#111827]">Access:</span> {proposal.project.accessNotes}</p> : null}
          {proposal.project.siteConditionNotes ? <p className="mt-2"><span className="font-black text-[#111827]">Site conditions:</span> {proposal.project.siteConditionNotes}</p> : null}
          <p className="mt-2">Schedule is subject to weather, site readiness, material availability, and coordination with other trades.</p>
        </div>
      </div>
    </section>
  );
}

function SignatureBlock({ proposal }) {
  return (
    <section className="proposal-section mt-6">
      <h2 className="text-sm font-black uppercase tracking-[0.18em] text-[#062B45]">Terms & Acceptance</h2>
      <div className="mt-3 grid gap-4 rounded-lg border border-[#D9DEE5] bg-white p-4 md:grid-cols-[1.15fr_0.85fr]">
        <div className="text-sm leading-6 text-[#5B6470]">
          {(proposal.terms || "").split(/\r?\n/).filter(Boolean).map((line) => <p key={line} className="mb-2">{line}</p>)}
          {proposal.warrantyNote ? <p className="mt-3 font-bold text-[#111827]">{proposal.warrantyNote}</p> : null}
        </div>
        <div className="rounded-lg border border-[#D9DEE5] bg-[#F4F5F6] p-4">
          <p className="text-sm font-bold text-[#5B6470]">{proposal.signatureNote || "Accepted by authorized representative."}</p>
          <div className="mt-8 grid gap-6 text-sm text-[#111827]">
            <div className="border-b border-[#111827] pb-1">Accepted by name</div>
            <div className="border-b border-[#111827] pb-1">Company / title</div>
            <div className="border-b border-[#111827] pb-1">Signature</div>
            <div className="border-b border-[#111827] pb-1">Date</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProposalFooter({ proposal }) {
  const company = proposal.company || APEX_HQ_PROPOSAL_COMPANY_DEFAULTS;
  return (
    <footer className="proposal-section mt-8 border-t border-[#D9DEE5] pt-4 text-center text-xs font-bold text-[#5B6470]">
      <p>{company.companyName} | {company.phone} | {company.email} | {company.ccb}</p>
      <p className="mt-1 text-[#062B45]">{company.tagline || "Clear scopes. Clean handoffs. Work won with confidence."}</p>
    </footer>
  );
}

function ProposalPrintView({ proposal, compact = false }) {
  const normalized = normalizeProposal(proposal, proposal.company);
  return (
    <article className={classNames(
      "proposal-document mx-auto bg-white text-[#111827]",
      compact ? "max-w-[760px] rounded-lg border border-[#D9DEE5] p-5 text-[12px] shadow-sm" : "max-w-[8.5in] rounded-lg border border-[#D9DEE5] p-8 shadow-lg",
    )}>
      <ProposalHeader proposal={normalized} compact={compact} />
      <ProposalHero proposal={normalized} compact={compact} />
      <PreparedForCard proposal={normalized} />
      <TrustCards />
      <PhotoStrip proposal={normalized} />
      <ScopeSectionPreview proposal={normalized} />
      {hasConcreteSpecs(normalized.concreteSpecs) ? <ConcreteSpecsTable proposal={normalized} /> : null}
      <PricingTable proposal={normalized} />
      <GcPrimeAddendum proposal={normalized} />
      <ExclusionsTerms proposal={normalized} />
      <SignatureBlock proposal={normalized} />
      <ProposalFooter proposal={normalized} />
    </article>
  );
}

function ProposalList({ proposals, onNew, onOpen, onDuplicate, onStatusChange }) {
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => filterProposals(proposals, { status: statusFilter, search }), [proposals, search, statusFilter]);
  const totals = useMemo(() => ({
    draft: proposals.filter((proposal) => proposal.status === "draft").length,
    sent: proposals.filter((proposal) => proposal.status === "sent").length,
    approved: proposals.filter((proposal) => proposal.status === "approved").length,
    value: proposals.reduce((sum, proposal) => sum + Number(proposal.total || 0), 0),
  }), [proposals]);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-4">
        <Metric label="Drafts" value={totals.draft} />
        <Metric label="Sent" value={totals.sent} />
        <Metric label="Approved" value={totals.approved} />
        <Metric label="Proposal value" value={formatCurrency(totals.value)} />
      </div>
      <ProposalCard className="overflow-hidden">
        <div className="grid gap-3 border-b border-[#D9DEE5] bg-white p-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex min-w-0 flex-wrap gap-2">
            {["All", "Draft", "Sent", "Approved", "Rejected", "Expired"].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={classNames(
                  "rounded-lg px-3 py-2 text-xs font-black transition",
                  statusFilter === status ? "bg-[#062B45] text-white" : "border border-[#D9DEE5] bg-white text-[#5B6470] hover:bg-[#F4F5F6]",
                )}
              >
                {status}
              </button>
            ))}
          </div>
          <label className="relative min-w-0 lg:w-80">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5B6470]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search client, project, GC, or status"
              className="block w-full rounded-lg border border-[#D9DEE5] bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#062B45] focus:ring-2 focus:ring-[#062B45]/10"
            />
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-[#F4F5F6] text-xs font-black uppercase tracking-[0.12em] text-[#5B6470]">
              <tr>
                <th className="px-4 py-3">Proposal</th>
                <th className="px-4 py-3">Client / GC</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((proposal) => (
                <tr key={proposal.id} className="border-t border-[#D9DEE5] bg-white align-top">
                  <td className="px-4 py-4">
                    <button type="button" onClick={() => onOpen(proposal.id)} className="text-left font-black text-[#062B45] hover:underline">
                      {proposal.proposalNumber}
                    </button>
                    <p className="mt-1 text-xs text-[#5B6470]">{formatDate(proposal.proposalDate)} | expires {formatDate(proposal.expirationDate)}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-bold text-[#111827]">{proposal.client.companyName || proposal.client.contactName || "Client pending"}</p>
                    <p className="mt-1 text-xs text-[#5B6470]">{proposal.proposalType === "gc_prime" ? proposal.gcPrime.contractorName || "GC pending" : proposal.client.contactName || proposal.client.phone || "Contact pending"}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-bold text-[#111827]">{proposal.project.name || "Project pending"}</p>
                    <p className="mt-1 text-xs text-[#5B6470]">{proposal.project.category} | {proposal.project.location || proposal.client.projectAddress || "Location pending"}</p>
                  </td>
                  <td className="px-4 py-4"><StatusPill status={proposal.status} /></td>
                  <td className="px-4 py-4 text-right font-black text-[#111827]">{formatCurrency(proposal.total)}</td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <ProposalButton size="sm" variant="secondary" icon="eye" onClick={() => onOpen(proposal.id)}>View</ProposalButton>
                      <ProposalButton size="sm" variant="secondary" icon="copy" onClick={() => onDuplicate(proposal.id)}>Duplicate</ProposalButton>
                      <select value={proposal.status} onChange={(event) => onStatusChange(proposal.id, event.target.value)} className="rounded-lg border border-[#D9DEE5] bg-white px-2 py-2 text-xs font-bold">
                        {PROPOSAL_STATUSES.map((status) => <option key={status} value={status}>{proposalStatusLabel(status)}</option>)}
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-12 text-center text-sm font-bold text-[#5B6470]">
                    No proposals match the current filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </ProposalCard>
      <div className="proposal-no-print flex justify-end">
        <ProposalButton icon="plus" onClick={onNew}>New proposal</ProposalButton>
      </div>
    </div>
  );
}

function ProposalActions({ proposal, onEdit, onPrint, onDuplicate, onStatusChange }) {
  return (
    <div className="proposal-no-print flex flex-wrap gap-2">
      <ProposalButton icon="edit" onClick={onEdit}>Edit</ProposalButton>
      <ProposalButton icon="print" variant="secondary" onClick={onPrint}>Print / PDF</ProposalButton>
      <ProposalButton icon="copy" variant="secondary" onClick={onDuplicate}>Duplicate</ProposalButton>
      {proposal.status !== "sent" ? <ProposalButton icon="check" variant="secondary" onClick={() => onStatusChange("sent")}>Mark sent</ProposalButton> : null}
      {proposal.status !== "approved" ? <ProposalButton icon="check" variant="gold" onClick={() => onStatusChange("approved")}>Approve</ProposalButton> : null}
      {proposal.status !== "rejected" ? <ProposalButton icon="x" variant="secondary" onClick={() => onStatusChange("rejected")}>Reject</ProposalButton> : null}
    </div>
  );
}

function ProposalDetail({ proposal, onBack, onEdit, onPrint, onDuplicate, onStatusChange }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="proposal-no-print space-y-4 xl:sticky xl:top-20 xl:self-start">
        <ProposalCard className="p-4">
          <button type="button" onClick={onBack} className="text-xs font-black uppercase tracking-[0.16em] text-[#5B6470] hover:text-[#062B45]">
            Back to proposals
          </button>
          <div className="mt-4">
            <StatusPill status={proposal.status} />
            <h2 className="mt-3 text-xl font-black text-[#111827]">{proposal.project.name || "Concrete Proposal"}</h2>
            <p className="mt-1 text-sm font-bold text-[#5B6470]">{proposal.proposalNumber}</p>
          </div>
          <div className="mt-4 grid gap-2 text-sm text-[#5B6470]">
            <p><span className="font-black text-[#111827]">Client:</span> {proposal.client.companyName || proposal.client.contactName || "Pending"}</p>
            <p><span className="font-black text-[#111827]">Type:</span> {proposalTypeLabel(proposal.proposalType)}</p>
            <p><span className="font-black text-[#111827]">Total:</span> {formatCurrency(proposal.total)}</p>
            <p><span className="font-black text-[#111827]">Expires:</span> {formatDate(proposal.expirationDate)}</p>
          </div>
        </ProposalCard>
        <ProposalActions
          proposal={proposal}
          onEdit={onEdit}
          onPrint={onPrint}
          onDuplicate={onDuplicate}
          onStatusChange={onStatusChange}
        />
      </aside>
      <ProposalPrintView proposal={proposal} />
    </div>
  );
}

function ProposalPrintRoute({ proposal, onBack }) {
  return (
    <div className="proposal-print-shell">
      <div className="proposal-no-print mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#D9DEE5] bg-white p-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#C9A64A]">Print view</p>
          <h1 className="text-xl font-black text-[#111827]">{proposal.proposalNumber}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <ProposalButton variant="secondary" icon="x" onClick={onBack}>Back</ProposalButton>
          <ProposalButton icon="print" onClick={() => window.print()}>Print / Save as PDF</ProposalButton>
        </div>
      </div>
      <ProposalPrintView proposal={proposal} />
    </div>
  );
}

export default function ProposalsWorkspace({ routeState = {}, navigateTo }) {
  const initialCompanyDefaults = useMemo(() => loadCompanyDefaults(), []);
  const [companyDefaults, setCompanyDefaults] = useState(initialCompanyDefaults);
  const [proposals, setProposals] = useState(() => loadStoredProposals(initialCompanyDefaults));
  const [draft, setDraft] = useState(() => createBlankProposal([], initialCompanyDefaults));
  const [editorOpen, setEditorOpen] = useState(false);
  const [validation, setValidation] = useState({ errors: [], warnings: [] });
  const mode = routeState.proposalMode || "list";
  const proposalId = routeState.proposalId || "";
  const currentProposal = proposals.find((proposal) => proposal.id === proposalId) || null;

  useEffect(() => {
    saveJson(PROPOSAL_COMPANY_STORAGE_KEY, companyDefaults);
  }, [companyDefaults]);

  useEffect(() => {
    saveJson(PROPOSAL_STORAGE_KEY, proposals);
  }, [proposals]);

  useEffect(() => {
    setValidation({ errors: [], warnings: [] });
    if (mode === "new") {
      setDraft(createBlankProposal(proposals, companyDefaults));
      setEditorOpen(true);
      return;
    }
    if (currentProposal) {
      setDraft(normalizeProposal(currentProposal, companyDefaults));
      setEditorOpen(false);
    }
  }, [mode, proposalId]);

  function go(path) {
    if (typeof navigateTo === "function") {
      navigateTo(path);
      return;
    }
    window.history.pushState({}, "", path);
  }

  function updateProposalRecord(proposalIdToUpdate, patch) {
    setProposals((current) => current.map((proposal) => (
      proposal.id === proposalIdToUpdate
        ? normalizeProposal({ ...proposal, ...patch, updatedAt: new Date().toISOString() }, companyDefaults)
        : proposal
    )));
  }

  function handleSaveDraft() {
    const normalized = normalizeProposal({
      ...draft,
      company: { ...companyDefaults, ...(draft.company || {}) },
      updatedAt: new Date().toISOString(),
    }, companyDefaults);
    const result = validateProposal(normalized);
    setValidation(result);
    if (result.errors.length > 0) return false;

    setProposals((current) => {
      const exists = current.some((proposal) => proposal.id === normalized.id);
      return exists
        ? current.map((proposal) => proposal.id === normalized.id ? normalized : proposal)
        : [normalized, ...current];
    });
    setEditorOpen(false);
    go(`/proposals/${encodeURIComponent(normalized.id)}`);
    return true;
  }

  function handleDuplicate(proposalIdToDuplicate = proposalId) {
    const source = proposals.find((proposal) => proposal.id === proposalIdToDuplicate);
    if (!source) return;
    const duplicate = duplicateProposal(source, proposals, companyDefaults);
    setProposals((current) => [duplicate, ...current]);
    go(`/proposals/${encodeURIComponent(duplicate.id)}`);
  }

  function handleStatusChange(proposalIdToUpdate, status) {
    updateProposalRecord(proposalIdToUpdate, { status });
  }

  function handleCancelEdit() {
    if (mode === "new") {
      go("/proposals");
      return;
    }
    if (currentProposal) setDraft(normalizeProposal(currentProposal, companyDefaults));
    setEditorOpen(false);
  }

  const normalizedProposals = useMemo(() => proposals.map((proposal) => normalizeProposal(proposal, companyDefaults)), [companyDefaults, proposals]);
  const normalizedCurrent = currentProposal ? normalizeProposal(currentProposal, companyDefaults) : null;

  return (
    <div className="min-w-0 bg-[#F4F5F6] text-[#111827]">
      <div className="proposal-no-print border-b border-[#D9DEE5] bg-white px-5 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#D9DEE5] bg-[#041D2F] p-2 shadow-sm">
              <img src={APEX_BRAND_ASSETS.appMark} alt="Apex HQ" className="h-full w-full object-contain" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#C9A64A]">Apex HQ Proposal Workspace</p>
              <h1 className="mt-1 text-3xl font-black tracking-tight text-[#062B45]">Proposal Generator</h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-[#5B6470]">
              Professional concrete proposals for GCs, prime contractors, builders, property managers, commercial clients, and homeowners.
            </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <ProposalButton variant="secondary" icon="file" onClick={() => go("/proposals")}>Proposal list</ProposalButton>
            <ProposalButton icon="plus" onClick={() => go("/proposals/new")}>New proposal</ProposalButton>
          </div>
        </div>
      </div>

      <main className="mx-auto min-w-0 max-w-[1600px] px-5 py-5 sm:px-6 lg:px-8">
        {mode === "list" ? (
          <ProposalList
            proposals={normalizedProposals}
            onNew={() => go("/proposals/new")}
            onOpen={(id) => go(`/proposals/${encodeURIComponent(id)}`)}
            onDuplicate={handleDuplicate}
            onStatusChange={handleStatusChange}
          />
        ) : null}

        {mode === "new" || editorOpen ? (
          <ProposalForm
            mode={mode}
            draft={draft}
            setDraft={setDraft}
            companyDefaults={companyDefaults}
            setCompanyDefaults={setCompanyDefaults}
            onSave={handleSaveDraft}
            onCancel={handleCancelEdit}
            validation={validation}
          />
        ) : null}

        {mode === "detail" && normalizedCurrent && !editorOpen ? (
          <ProposalDetail
            proposal={normalizedCurrent}
            onBack={() => go("/proposals")}
            onEdit={() => {
              setDraft(normalizeProposal(normalizedCurrent, companyDefaults));
              setEditorOpen(true);
            }}
            onPrint={() => go(`/proposals/${encodeURIComponent(normalizedCurrent.id)}/print`)}
            onDuplicate={() => handleDuplicate(normalizedCurrent.id)}
            onStatusChange={(status) => handleStatusChange(normalizedCurrent.id, status)}
          />
        ) : null}

        {mode === "print" && normalizedCurrent ? (
          <ProposalPrintRoute proposal={normalizedCurrent} onBack={() => go(`/proposals/${encodeURIComponent(normalizedCurrent.id)}`)} />
        ) : null}

        {(mode === "detail" || mode === "print") && !normalizedCurrent ? (
          <ProposalCard className="p-6 text-center">
            <p className="text-lg font-black text-[#111827]">Proposal not found</p>
            <p className="mt-2 text-sm text-[#5B6470]">The proposal may have been removed from local storage.</p>
            <div className="mt-4">
              <ProposalButton variant="secondary" onClick={() => go("/proposals")}>Back to proposals</ProposalButton>
            </div>
          </ProposalCard>
        ) : null}
      </main>
    </div>
  );
}
