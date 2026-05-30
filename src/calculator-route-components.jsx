import { useEffect, useMemo, useRef, useState } from "react";

import {
  ApexOfficeCommandShell,
  Button,
  Card,
  Icon,
  InputField,
  PageHeader,
  SectionHeader,
  SelectField,
  StateCard,
  TextAreaField,
} from "./app-shell-components";
import { buildCalculatorCopyText, calculateConcreteResult, calculateTakeoffResult, calculatorTypeLabel, CALCULATOR_MODE_OPTIONS, CALCULATOR_TYPES, createTakeoffSection, formatCubicFeet, formatCubicYards, summarizeTakeoffSection, WASTE_OPTIONS } from "./calculator-utils";
import { CommandCenterKpiCard } from "./command-center-route-components";
import { FieldOperatorPanelShell } from "./field-route-components";
import { deriveAllowedUploadJobs } from "./upload-utils";
import { jobTitle } from "./job-utils";
import { canViewJob } from "../shared/permissions.js";

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

const INITIAL_CALCULATOR_SAVE_FORM = {
  jobId: "",
  notes: "",
};

const CALCULATOR_INPUT_DEFAULTS = {
  slab: { length: "", width: "", thicknessInches: "" },
  footing: { length: "", width: "", depth: "" },
  wall: { length: "", height: "", thicknessInches: "" },
  roundColumn: { diameterInches: "", height: "" },
};

const INITIAL_TAKEOFF_SECTION_FORM = {
  label: "",
  notes: "",
};

const CALCULATOR_FIELD_CONFIG = {
  slab: [
    { key: "length", label: "Length (ft)", placeholder: "20" },
    { key: "width", label: "Width (ft)", placeholder: "12" },
    { key: "thicknessInches", label: "Thickness (in)", placeholder: "4" },
  ],
  footing: [
    { key: "length", label: "Length (ft)", placeholder: "30" },
    { key: "width", label: "Width (ft)", placeholder: "2" },
    { key: "depth", label: "Depth (ft)", placeholder: "1.5" },
  ],
  wall: [
    { key: "length", label: "Length (ft)", placeholder: "24" },
    { key: "height", label: "Height (ft)", placeholder: "6" },
    { key: "thicknessInches", label: "Thickness (in)", placeholder: "8" },
  ],
  roundColumn: [
    { key: "diameterInches", label: "Diameter (in)", placeholder: "24" },
    { key: "height", label: "Height (ft)", placeholder: "10" },
  ],
};

function createCalculatorSectionId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `section-${Date.now()}-${Math.round(Math.random() * 100000)}`;
}

function defaultTakeoffSectionLabel(index) {
  return `Section ${index + 1}`;
}

function deriveAllowedCalculatorJobs(jobs, user, permissions) {
  const activeJobs = deriveAllowedUploadJobs(jobs);
  if (permissions?.jobs?.canManageAll || permissions?.jobs?.canViewMoney) return activeJobs;
  return activeJobs.filter((job) => canViewJob(job, user));
}

function CalculatorModeTabsPolished({ calculatorMode, setCalculatorMode, onModeChange }) {
  return (
    <div className="co-toolbox-category-tabs">
      {CALCULATOR_MODE_OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          className={calculatorMode === option.id ? "is-active" : ""}
          onClick={() => (onModeChange ? onModeChange(option.id) : setCalculatorMode(option.id))}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function CalculatorTypeTabsPolished({ calculatorType, setCalculatorType }) {
  return (
    <div className="co-calculator-type-tabs grid gap-2 sm:grid-cols-4">
      {CALCULATOR_TYPES.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => setCalculatorType(option.id)}
          className={`min-h-[3.25rem] rounded-xl border px-3 py-2 text-sm font-black transition ${calculatorType === option.id ? "border-orange-300 bg-orange-600 text-white shadow-sm shadow-orange-600/20" : "border-slate-200 bg-white text-slate-700 hover:border-orange-200 hover:bg-orange-50"}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function CalculatorInputPanelPolished({
  calculatorMode,
  calculatorType,
  setCalculatorType,
  activeFields,
  activeDraft,
  sectionForm,
  takeoffSections,
  editingSectionId,
  updateSectionForm,
  updateField,
  wastePreset,
  setWastePreset,
  customWastePercent,
  setCustomWastePercent,
  addOrUpdateSection,
  resetSectionBuilder,
  resetCalculator,
  copyResult,
  resultCopied,
  result,
  setSavePanelOpen,
  setSaveMessage,
}) {
  const sectionReady = calculateConcreteResult(calculatorType, activeDraft, 0).status === "ready";

  return (
    <Card className="co-toolbox-main-board overflow-hidden">
      <div className="co-toolbox-board-header border-b border-slate-200 bg-white p-4">
        <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <h2 className="text-base font-black uppercase tracking-[0.04em] text-slate-950">{calculatorMode === "multi_section" ? "Takeoff Builder" : "Concrete Calculator"}</h2>
            <p className="mt-1 text-sm font-bold leading-5 text-slate-600">{calculatorMode === "multi_section" ? "Build the pour one section at a time, then total the takeoff with waste." : "Enter the pour dimensions, review the live yield, copy it, or save it to an allowed job."}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={resetCalculator}>{calculatorMode === "multi_section" ? "Reset takeoff" : "Reset"}</Button>
            <Button type="button" size="sm" onClick={() => { setSavePanelOpen((current) => !current); setSaveMessage(""); }} disabled={result.status !== "ready"}>Save to Job</Button>
          </div>
        </div>
      </div>

      <div className="border-b border-slate-200 bg-white p-4">
        <SectionHeader title={calculatorMode === "multi_section" ? "Section Type" : "Pour Shape"} description={calculatorMode === "multi_section" ? "Choose the shape for the section you are adding or editing." : "Choose the concrete shape for this calculation."} />
        <CalculatorTypeTabsPolished calculatorType={calculatorType} setCalculatorType={setCalculatorType} />
      </div>

      <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_minmax(14rem,18rem)]">
        <div className="min-w-0">
          <SectionHeader title={calculatorMode === "multi_section" ? (editingSectionId ? "Edit Section" : "Add Section") : "Dimensions"} description="Fields stay explicit about feet and inches so field users do not need to guess units." />
          {calculatorMode === "multi_section" ? (
            <div className="mb-4 grid gap-3 md:grid-cols-2">
              <InputField label="Section label" placeholder={`e.g. ${defaultTakeoffSectionLabel(takeoffSections.length)}`} value={sectionForm.label} onChange={(event) => updateSectionForm("label", event.target.value)} />
              <TextAreaField label="Section note" value={sectionForm.notes} onChange={(event) => updateSectionForm("notes", event.target.value)} placeholder="Optional team-visible note for this section." />
            </div>
          ) : null}
          <div className="grid gap-3 md:grid-cols-2">
            {activeFields.map((field) => (
              <InputField
                key={field.key}
                label={field.label}
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                placeholder={field.placeholder}
                value={activeDraft[field.key] ?? ""}
                onChange={(event) => updateField(field.key, event.target.value)}
              />
            ))}
          </div>
        </div>

        <div className="co-calculator-waste-panel min-w-0 rounded-[0.9rem] border border-slate-200 bg-slate-50 p-4">
          <SectionHeader title="Waste Factor" description="Keep the buffer visible before copying or saving." />
          <div className="grid gap-3">
            <SelectField label="Waste factor" value={wastePreset} onChange={(event) => setWastePreset(event.target.value)}>
              {WASTE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </SelectField>
            {wastePreset === "custom" ? (
              <InputField
                label="Custom waste (%)"
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                placeholder="12"
                value={customWastePercent}
                onChange={(event) => setCustomWastePercent(event.target.value)}
              />
            ) : null}
          </div>
          <div className="co-calculator-waste-actions mt-4 flex flex-wrap gap-2">
            {calculatorMode === "multi_section" ? (
              <Button type="button" onClick={addOrUpdateSection} disabled={!sectionReady}>
                {editingSectionId ? "Save section" : "Add section"}
              </Button>
            ) : null}
            {calculatorMode === "multi_section" && editingSectionId ? (
              <Button type="button" variant="secondary" onClick={() => resetSectionBuilder()}>Cancel edit</Button>
            ) : null}
            <Button type="button" variant="secondary" onClick={copyResult} disabled={result.status !== "ready"}>
              {resultCopied ? "Copied" : calculatorMode === "multi_section" ? "Copy takeoff" : "Copy result"}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function CalculatorResultRailPolished({ result, calculatorMode, takeoffSections, resultCopied, onFocusInput, onCopyResult, onSaveResult, onStartTakeoff }) {
  const ready = result.status === "ready";
  const assistantPriorities = [
    {
      label: ready ? `${formatCubicYards(result.cubicYardsWithWaste)} is ready with waste` : "Enter valid dimensions before using the field total",
      tone: ready ? "ready" : "warn",
    },
    {
      label: calculatorMode === "multi_section" ? `${takeoffSections.length} takeoff section${takeoffSections.length === 1 ? "" : "s"} in progress` : "Single pour mode is active",
      tone: calculatorMode === "multi_section" && takeoffSections.length ? "ready" : "default",
    },
    {
      label: ready ? "Copy text and job save are available" : "Copy and save stay locked until the result is safe",
      tone: ready ? "ready" : "default",
    },
  ];
  const assistantActions = [
    { label: ready ? (resultCopied ? "Result copied" : "Copy field total") : "Enter dimensions", icon: ready ? "clipboard" : "calculator", onClick: ready ? onCopyResult : onFocusInput },
    { label: ready ? "Save to job" : "Prepare job save", icon: "briefcase", onClick: ready ? onSaveResult : onFocusInput },
    { label: calculatorMode === "multi_section" ? "Add takeoff section" : "Build takeoff", icon: "plus", onClick: onStartTakeoff },
  ];

  return (
    <div className="co-toolbox-right-rail co-calculator-office-assistant space-y-4">
      <div className="co-prepour-assistant-card co-calculator-assistant-card p-0">
        <div className="co-prepour-assistant-topbar">
          <span><Icon name="spark" /></span>
          <strong>Apex Assistant</strong>
          <em>Calc</em>
        </div>
        <div className="co-prepour-assistant-body">
          <p className="co-prepour-assistant-kicker">Yield command</p>
          <h3>{ready ? `${formatCubicYards(result.cubicYardsWithWaste)} ready to use` : "Build a safe field total."}</h3>
          <p>{ready ? (result.summary || "The concrete yield is ready to copy or save internally.") : "Fill the required dimensions and keep the calculator blank until the math is valid."}</p>
          <div className="co-prepour-assistant-priorities">
            {assistantPriorities.map((item) => <span key={item.label} data-tone={item.tone}>{item.label}</span>)}
          </div>
          <div className="co-prepour-assistant-actions">
            {assistantActions.map((item) => (
              <button key={item.label} type="button" onClick={item.onClick}>
                <Icon name={item.icon} />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Card className="co-toolbox-rail-card overflow-hidden">
        <div className="bg-slate-950 p-5 text-white">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-orange-200">Live Result</p>
          {ready ? (
            <>
              <p className="mt-3 text-4xl font-black tracking-tight">{formatCubicYards(result.cubicYardsWithWaste).replace(" yd^3", "")}</p>
              <p className="text-base font-black text-slate-200">yd^3 with waste</p>
              <p className="mt-3 text-sm font-bold leading-6 text-slate-300">{result.summary || "Ready to copy or save internally."}</p>
            </>
          ) : (
            <>
              <p className="mt-3 text-2xl font-black tracking-tight">Waiting on dimensions</p>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-300">
                {result.status === "invalid" ? "Use zero or positive numbers only." : calculatorMode === "multi_section" ? "Add one valid section to see the takeoff total." : "Enter the pour dimensions to calculate volume."}
              </p>
            </>
          )}
        </div>
        <div className="co-toolbox-selected-metrics p-4">
          <div><span>Base</span><strong>{ready ? formatCubicYards(result.baseCubicYards) : "--"}</strong></div>
          <div><span>With waste</span><strong>{ready ? formatCubicYards(result.cubicYardsWithWaste) : "--"}</strong></div>
          <div><span>Cubic feet</span><strong>{ready ? formatCubicFeet(result.baseCubicFeet) : "--"}</strong></div>
          <div><span>Sections</span><strong>{calculatorMode === "multi_section" ? (ready ? result.sectionCount : takeoffSections.length) : "Single"}</strong></div>
        </div>
      </Card>

      <Card className="co-toolbox-rail-card p-4">
        <SectionHeader title="Calculation Check" description="The page stays blank instead of showing misleading totals until inputs are valid." />
        <div className="co-toolbox-readiness-list">
          <span data-state={result.status === "invalid" ? "needs" : "ready"}>Values <strong>{result.status === "invalid" ? "Fix" : "Safe"}</strong></span>
          <span data-state={ready ? "ready" : "needs"}>Dimensions <strong>{ready ? "Complete" : "Needed"}</strong></span>
          <span data-state={ready ? "ready" : "needs"}>Copy text <strong>{ready ? "Ready" : "Pending"}</strong></span>
          <span data-state={ready ? "ready" : "needs"}>Job save <strong>{ready ? "Available" : "Pending"}</strong></span>
        </div>
      </Card>
    </div>
  );
}

function CalculatorFieldCommandRailPolished({
  result,
  calculatorMode,
  takeoffSections,
  allowedJobs,
  resultCopied,
  onFocusInput,
  onCopyResult,
  onSaveResult,
  onStartTakeoff,
}) {
  const ready = result.status === "ready";
  const resultValue = ready ? formatCubicYards(result.cubicYardsWithWaste).replace(" yd^3", "") : "Open";
  const statusItems = [
    { label: "Values", value: result.status === "invalid" ? "Fix" : "Safe", state: result.status === "invalid" ? "needs" : "ready" },
    { label: "Dimensions", value: ready ? "Complete" : "Needed", state: ready ? "ready" : "needs" },
    { label: "Copy text", value: ready ? "Ready" : "Pending", state: ready ? "ready" : "needs" },
    { label: "Job save", value: ready && allowedJobs.length ? "Ready" : "Pending", state: ready && allowedJobs.length ? "ready" : "needs" },
  ];
  const planItems = [
    { label: "Enter pour dimensions", state: ready ? "ready" : "active" },
    { label: ready ? "Copy field total" : "Review live yield", state: ready ? "active" : "needs" },
    { label: allowedJobs.length ? "Save to visible job" : "Use as copy-only total", state: allowedJobs.length ? "ready" : "needs" },
  ];

  return (
    <div className="co-toolbox-right-rail co-calculator-field-rail space-y-3">
      <Card className="co-toolbox-rail-card co-calculator-field-rail-result overflow-hidden">
        <div className="co-calculator-field-rail-result-head">
          <p>Live Field Total</p>
          <h2>{ready ? `${resultValue} yd^3` : "Waiting on dims"}</h2>
          <span>{ready ? (result.summary || "Ready to copy or save to an allowed job.") : "Fill the required dimensions to unlock copy and save."}</span>
        </div>
        <div className="co-calculator-field-rail-actions">
          <Button type="button" onClick={ready ? onCopyResult : onFocusInput}>
            <Icon name={ready ? "clipboard" : "calculator"} />
            {ready ? (resultCopied ? "Copied" : "Copy Result") : "Enter Dims"}
          </Button>
          <Button type="button" variant="secondary" onClick={onSaveResult}>
            <Icon name="briefcase" />
            {ready ? "Save to Job" : "Save Later"}
          </Button>
          <Button type="button" variant="secondary" onClick={onStartTakeoff}>
            <Icon name="plus" />
            {calculatorMode === "multi_section" ? "Add Section" : "Build Takeoff"}
          </Button>
        </div>
      </Card>

      <Card className="co-toolbox-rail-card p-4">
        <SectionHeader title="Readiness" description="Field-safe check before the result becomes a saved job record." />
        <div className="co-toolbox-readiness-list">
          {statusItems.map((item) => (
            <span key={item.label} data-state={item.state}>
              {item.label}
              <strong>{item.value}</strong>
            </span>
          ))}
        </div>
      </Card>

      <Card className="co-toolbox-rail-card p-4">
        <SectionHeader title="Field Plan" description="The calculator stays focused on yield, takeoff, copy, and allowed job saves." />
        <div className="co-calculator-field-steps">
          {planItems.map((item, index) => (
            <span key={item.label} data-state={item.state}>
              <em>{index + 1}</em>
              <strong>{item.label}</strong>
            </span>
          ))}
        </div>
        <div className="co-toolbox-selected-metrics">
          <div><span>Mode</span><strong>{calculatorMode === "multi_section" ? "Takeoff" : "Single"}</strong></div>
          <div><span>Sections</span><strong>{calculatorMode === "multi_section" ? takeoffSections.length : "Single"}</strong></div>
          <div><span>Job saves</span><strong>{allowedJobs.length}</strong></div>
          <div><span>Scope</span><strong>Job-safe</strong></div>
        </div>
      </Card>
    </div>
  );
}

function CalculatorSavePanelPolished({ savePanelOpen, allowedJobs, saveDraft, setSaveDraft, handleSaveResult, busy, setSavePanelOpen, saveMessage, isFieldTool = false }) {
  if (!savePanelOpen && !saveMessage) return null;

  return (
    <Card className="co-toolbox-form-card p-4">
      {savePanelOpen ? (
        allowedJobs.length === 0 ? (
          <StateCard title="No available job to save this calculation" description="Assigned or visible jobs will appear here when there is somewhere safe to store the result." tone="slate" />
        ) : (
          <div className="grid gap-3">
            <SectionHeader title="Save to Job" description={isFieldTool ? "This stores the calculation on an allowed job for the team." : "This stores a team-visible company record. Customers do not see it."} />
            <SelectField label="Job" value={saveDraft.jobId} onChange={(event) => setSaveDraft((current) => ({ ...current, jobId: event.target.value }))}>
              {allowedJobs.map((job) => <option key={job.id} value={job.id}>{jobTitle(job)}</option>)}
            </SelectField>
            <TextAreaField label={isFieldTool ? "Job note" : "Team note"} value={saveDraft.notes} onChange={(event) => setSaveDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Optional team-visible note for this job calculation." />
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={handleSaveResult} disabled={busy || !saveDraft.jobId}>Save</Button>
              <Button type="button" variant="secondary" onClick={() => setSavePanelOpen(false)} disabled={busy}>Cancel</Button>
            </div>
          </div>
        )
      ) : null}
      {saveMessage ? <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{saveMessage}</div> : null}
    </Card>
  );
}

function CalculatorTakeoffSectionsPolished({ calculatorMode, takeoffSections, editSection, duplicateSection, removeSection }) {
  if (calculatorMode !== "multi_section") return null;

  return (
    <Card className="co-toolbox-form-card p-4">
      <SectionHeader title="Takeoff Sections" description="Each section keeps its own dimensions so the full takeoff can be copied or saved to the job." />
      {takeoffSections.length === 0 ? (
        <StateCard title="No sections added yet" description="Add one or more panels, runs, or pours to build a running total." tone="slate" />
      ) : (
        <div className="grid gap-3">
          {takeoffSections.map((section, index) => (
            <div key={section.id} className="rounded-[0.9rem] border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="break-words text-sm font-black text-slate-950">{summarizeTakeoffSection(section, index)}</p>
                  <p className="mt-1 text-sm font-bold text-slate-600">{calculatorTypeLabel(section.calculatorType)} / {formatCubicYards(section.cubicYards)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="secondary" onClick={() => editSection(section)}>Edit</Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => duplicateSection(section)}>Duplicate</Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => removeSection(section.id)}>Remove</Button>
                </div>
              </div>
              {section.notes ? <p className="mt-3 text-sm font-bold leading-6 text-slate-600">{section.notes}</p> : null}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function CalculatorSummaryPanelPolished({ result, calculatorMode, isFieldTool = false }) {
  if (isFieldTool && result.status !== "ready") return null;

  return (
    <Card className="co-toolbox-form-card co-calculator-summary-card p-4">
      <SectionHeader title="Calculation Summary" description={result.status === "ready" ? "Copy this into a text or note for quick field coordination." : "The summary will appear once enough dimensions are entered."} />
      {result.status === "ready" ? (
        <div className="co-toolbox-note-panel">
          <span>Summary</span>
          <p>{result.summary}</p>
          <p>Base: {formatCubicYards(result.baseCubicYards)}</p>
          <p>With {result.wastePercent}% waste: {formatCubicYards(result.cubicYardsWithWaste)}</p>
          {calculatorMode === "multi_section" && Array.isArray(result.sections) && result.sections.length > 0 ? (
            <div className="mt-3 grid gap-2">
              {result.sections.map((section, index) => (
                <div key={section.id || `${section.label}-${index}`} className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-sm font-black text-slate-950">{summarizeTakeoffSection(section, index)}</p>
                  <p className="mt-1 text-sm font-bold text-slate-600">{formatCubicYards(section.cubicYards)} / {formatCubicFeet(section.cubicFeet)}</p>
                  {section.notes ? <p className="mt-1 text-sm font-bold leading-6 text-slate-600">{section.notes}</p> : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <StateCard
          title={result.status === "invalid" ? "Dimensions need a quick fix" : "No calculation yet"}
          description={result.status === "invalid" ? "Update the negative value above and the result card will recalculate." : calculatorMode === "multi_section" ? "Add at least one valid section so the page can total the takeoff without ever falling back to NaN." : "Missing inputs stay blank on purpose so the page never falls back to NaN or misleading totals."}
          tone={result.status === "invalid" ? "red" : "slate"}
        />
      )}
    </Card>
  );
}

function CalculatorFieldOperatorPanel({ calculatorMode, calculatorType, activeFields, enteredDimensionCount, result, allowedJobs, resultCopied, onFocusInput, onCopyResult, onSaveResult, onStartTakeoff }) {
  const resultReady = result.status === "ready";
  const resultValue = resultReady ? formatCubicYards(result.cubicYardsWithWaste).replace(" yd^3", "") : "Open";
  const summaryItems = [
    { label: "Pour shape", value: calculatorTypeLabel(calculatorType), tone: "orange" },
    { label: "Inputs", value: `${enteredDimensionCount}/${activeFields.length}`, tone: enteredDimensionCount === activeFields.length ? "green" : "amber" },
    { label: "Live result", value: resultValue, tone: resultReady ? "green" : "slate" },
    { label: "Job saves", value: allowedJobs.length, tone: allowedJobs.length ? "orange" : "slate" },
  ];

  return (
    <div className="co-calculator-field-panel-wrap mx-auto w-full max-w-[1520px] min-w-0 px-5 pb-3 sm:px-6 lg:px-6">
      <FieldOperatorPanelShell
        className="co-calculator-field-panel"
        badges={[
          { label: "Field Calculator", tone: "orange" },
          { label: calculatorMode === "multi_section" ? "Takeoff" : "Single pour", tone: calculatorMode === "multi_section" ? "orange" : "slate" },
          { label: resultReady ? "Result ready" : "Needs dimensions", tone: resultReady ? "green" : "amber" },
        ]}
        title={resultReady ? `${resultValue} yd^3 with waste` : "Calculator ready"}
        description={resultReady ? result.summary : "Enter dimensions, then copy a field-ready total or save this calculation to an allowed job."}
        meta={`${calculatorTypeLabel(calculatorType)} / ${activeFields.length} required dimension${activeFields.length === 1 ? "" : "s"}`}
        metaIcon="calculator"
        actions={[
          resultReady
            ? { id: "copy", label: resultCopied ? "Copied" : "Copy Result", icon: "clipboard", onClick: onCopyResult }
            : { id: "dims", label: "Enter Dimensions", icon: "calculator", onClick: onFocusInput },
          { id: "save", label: resultReady ? "Save to Job" : "Finish Dims", icon: resultReady ? "briefcase" : "layers", variant: "secondary", onClick: onSaveResult },
          { id: "takeoff", label: "Build Takeoff", icon: "plus", variant: "secondary", onClick: onStartTakeoff },
        ]}
        facts={summaryItems}
      />
    </div>
  );
}

function CalculatorFieldResultDock({ result, calculatorMode, takeoffSections, allowedJobs }) {
  const ready = result.status === "ready";
  const resultValue = ready ? formatCubicYards(result.cubicYardsWithWaste).replace(" yd^3", "") : "Open";
  const statusItems = [
    { label: "Values", value: result.status === "invalid" ? "Fix" : "Safe", state: result.status === "invalid" ? "needs" : "ready" },
    { label: "Dimensions", value: ready ? "Complete" : "Needed", state: ready ? "ready" : "needs" },
    { label: "Copy text", value: ready ? "Ready" : "Pending", state: ready ? "ready" : "needs" },
    { label: "Job save", value: ready && allowedJobs.length ? "Ready" : "Pending", state: ready && allowedJobs.length ? "ready" : "needs" },
  ];
  const metricItems = [
    { label: "With waste", value: ready ? formatCubicYards(result.cubicYardsWithWaste) : "--", tone: ready ? "green" : "slate" },
    { label: "Base yield", value: ready ? formatCubicYards(result.baseCubicYards) : "--", tone: "slate" },
    { label: "Cubic feet", value: ready ? formatCubicFeet(result.baseCubicFeet) : "--", tone: "slate" },
    { label: "Sections", value: calculatorMode === "multi_section" ? (ready ? result.sectionCount : takeoffSections.length) : "Single", tone: calculatorMode === "multi_section" ? "orange" : "slate" },
  ];

  return (
    <div className="co-calculator-field-result-wrap mx-auto w-full max-w-[1520px] min-w-0 px-5 pb-3 sm:px-6 lg:px-6">
      <Card className="co-calculator-field-result-card overflow-hidden">
        <div className="co-calculator-field-result-main">
          <div className="co-calculator-field-result-copy min-w-0">
            <Badge tone={ready ? "green" : result.status === "invalid" ? "red" : "amber"}>{ready ? "Ready to use" : result.status === "invalid" ? "Needs fix" : "Needs dimensions"}</Badge>
            <h2>{ready ? `${resultValue} yd^3` : "Live result waiting"}</h2>
            <p>
              {ready
                ? (result.summary || "Copy the field total or save this calculation to an allowed job.")
                : result.status === "invalid"
                  ? "Use zero or positive numbers only, then the field total will recalculate."
                  : calculatorMode === "multi_section"
                    ? "Add one valid section to total this takeoff."
                : "Enter the pour dimensions to calculate a field-ready total."}
            </p>
          </div>
        </div>

        <div className="co-calculator-field-result-grid">
          {metricItems.map((item) => (
            <div key={item.label} data-tone={item.tone}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>

        <div className="co-calculator-field-status-grid">
          {statusItems.map((item) => (
            <span key={item.label} data-state={item.state}>
              {item.label}
              <strong>{item.value}</strong>
            </span>
          ))}
        </div>
      </Card>
    </div>
  );
}

function CalculatorMobileFocusPanel({
  calculatorMode,
  calculatorType,
  activeFields,
  enteredDimensionCount,
  result,
  allowedJobs,
  resultCopied,
  onFocusInput,
  onCopyResult,
  onSaveResult,
  onStartTakeoff,
  onModeChange,
}) {
  const resultReady = result.status === "ready";
  const resultValue = resultReady ? formatCubicYards(result.cubicYardsWithWaste).replace(" yd^3", "") : "Open";
  const shapeLabel = calculatorTypeLabel(calculatorType);
  const focusTitle = resultReady ? `${resultValue} yd^3 ready` : "Pour calculator ready";
  const focusCopy = resultReady
    ? (result.summary || "Copy the field total or save this calculation to an allowed job.")
    : "Enter dimensions first, then copy a field-ready total or save this calculation to an allowed job.";
  const metricItems = [
    { label: "Shape", value: shapeLabel, tone: "orange", onClick: onFocusInput },
    { label: "Dims", value: `${enteredDimensionCount}/${activeFields.length}`, tone: enteredDimensionCount === activeFields.length ? "green" : "amber", onClick: onFocusInput },
    { label: "Result", value: resultValue, tone: resultReady ? "green" : "slate", onClick: resultReady ? onCopyResult : onFocusInput },
    { label: "Jobs", value: allowedJobs.length, tone: allowedJobs.length ? "orange" : "slate", onClick: onSaveResult },
  ];

  return (
    <section className="co-prepour-mobile-focus co-toolbox-mobile-focus co-calculator-mobile-focus mx-4 mb-3 md:hidden" aria-label="Calculator mobile focus">
      <div className="co-prepour-mobile-focus-copy">
        <span>Calculator Focus</span>
        <h2>{focusTitle}</h2>
        <p>{focusCopy}</p>
        <em>{calculatorMode === "multi_section" ? "Multi-section takeoff" : `${shapeLabel} / ${activeFields.length} required dimension${activeFields.length === 1 ? "" : "s"}`}</em>
      </div>

      <div className="co-prepour-mobile-focus-actions">
        <Button type="button" onClick={resultReady ? onCopyResult : onFocusInput}>
          <Icon name={resultReady ? "clipboard" : "calculator"} />
          {resultReady ? (resultCopied ? "Copied" : "Copy") : "Dims"}
        </Button>
        <Button type="button" variant="secondary" onClick={onSaveResult}>
          <Icon name="briefcase" />
          Save
        </Button>
        <Button type="button" variant="secondary" onClick={calculatorMode === "multi_section" ? () => onModeChange?.("single") : onStartTakeoff}>
          <Icon name={calculatorMode === "multi_section" ? "calculator" : "plus"} />
          {calculatorMode === "multi_section" ? "Single" : "Takeoff"}
        </Button>
      </div>

      <div className="co-prepour-mobile-focus-metrics">
        {metricItems.map((metric) => (
          <button key={metric.label} type="button" className="co-field-touch-target" data-tone={metric.tone} onClick={metric.onClick}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </button>
        ))}
      </div>
    </section>
  );
}

function CalculatorPagePolished({
  calculatorMode,
  setCalculatorMode,
  calculatorType,
  setCalculatorType,
  activeDraft,
  activeFields,
  sectionForm,
  takeoffSections,
  editingSectionId,
  updateSectionForm,
  updateField,
  wastePreset,
  setWastePreset,
  customWastePercent,
  setCustomWastePercent,
  activeWastePercent,
  result,
  calculatorKpis,
  addOrUpdateSection,
  resetSectionBuilder,
  resetCalculator,
  copyResult,
  resultCopied,
  savePanelOpen,
  setSavePanelOpen,
  saveMessage,
  setSaveMessage,
  allowedJobs,
  saveDraft,
  setSaveDraft,
  handleSaveResult,
  isFieldTool = false,
  busy,
  editSection,
  duplicateSection,
  removeSection,
}) {
  const [showAllMobileCalculatorActions, setShowAllMobileCalculatorActions] = useState(false);
  const [selectedCalculatorShellId, setSelectedCalculatorShellId] = useState("dimensions");
  const canUseCalculatorCommandShell = useDesktopCommandViewport(1180) && !isFieldTool;
  const enteredDimensionCount = activeFields.filter((field) => String(activeDraft[field.key] ?? "").trim() !== "").length;
  const resultReady = result.status === "ready";

  function focusCalculatorInput() {
    window.setTimeout(() => {
      document.querySelector(".co-calculator-page input:not([type='hidden']), .co-calculator-page select, .co-calculator-page textarea")?.focus?.();
    }, 0);
  }

  function openSaveFromPriority() {
    if (!resultReady) {
      focusCalculatorInput();
      return;
    }
    setSavePanelOpen((current) => !current);
    setSaveMessage("");
  }

  function copyFromPriority() {
    if (!resultReady) {
      focusCalculatorInput();
      return;
    }
    copyResult();
  }

  function changeCalculatorMode(nextMode) {
    if (!nextMode || nextMode === calculatorMode) return;
    setCalculatorMode(nextMode);
    window.setTimeout(() => {
      document.querySelector(".co-calculator-page .co-toolbox-main-board")?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    }, 0);
  }

  function startTakeoffMode() {
    changeCalculatorMode("multi_section");
    focusCalculatorInput();
  }

  const dimensionsPriorityCard = {
    label: "Dimensions",
    value: `${enteredDimensionCount}/${activeFields.length}`,
    helper: enteredDimensionCount === activeFields.length ? "Required fields are filled for the selected pour shape." : "Fill the missing dimensions to unlock the result.",
    icon: "layers",
    tone: enteredDimensionCount === activeFields.length ? "green" : "orange",
    actionLabel: "Enter dims",
    onAction: focusCalculatorInput,
  };
  const liveResultPriorityCard = {
    label: "Live result",
    value: resultReady ? formatCubicYards(result.cubicYardsWithWaste).replace(" yd^3", "") : "Open",
    helper: resultReady ? "Concrete yield with waste is ready to copy or save." : "Waiting on valid dimensions before showing a total.",
    icon: "calculator",
    tone: resultReady ? "green" : "slate",
    actionLabel: resultReady ? "Copy" : "Calculate",
    onAction: copyFromPriority,
  };
  const saveToJobPriorityCard = {
    label: "Save to job",
    value: allowedJobs.length,
    helper: allowedJobs.length ? "Allowed jobs are available for internal calculation records." : "No assigned or visible job is available to save into.",
    icon: "briefcase",
    tone: resultReady && allowedJobs.length ? "orange" : "slate",
    actionLabel: resultReady ? "Save" : "Finish dims",
    onAction: openSaveFromPriority,
  };
  const takeoffModePriorityCard = {
    label: "Takeoff mode",
    value: calculatorMode === "multi_section" ? takeoffSections.length : "Single",
    helper: calculatorMode === "multi_section" ? "Build a multi-section takeoff one pour at a time." : "Switch to multi-section when the pour has separate areas.",
    icon: "plus",
    tone: "orange",
    actionLabel: calculatorMode === "multi_section" ? "Add section" : "Build takeoff",
    onAction: startTakeoffMode,
  };
  const calculatorPriorityCards = isFieldTool
    ? [dimensionsPriorityCard, liveResultPriorityCard, takeoffModePriorityCard, saveToJobPriorityCard]
    : [dimensionsPriorityCard, liveResultPriorityCard, saveToJobPriorityCard, takeoffModePriorityCard];
  const calculatorShellQueue = [
    { id: "dimensions", eyebrow: "Step 1", card: dimensionsPriorityCard },
    { id: "result", eyebrow: "Step 2", card: liveResultPriorityCard },
    { id: "save", eyebrow: "Step 3", card: saveToJobPriorityCard },
    { id: "takeoff", eyebrow: "Optional", card: takeoffModePriorityCard },
  ].map(({ id, eyebrow, card }) => ({
    id,
    eyebrow,
    title: card.label,
    meta: card.helper,
    statusLabel: String(card.value),
    tone: card.tone,
    actionLabel: card.actionLabel,
    onAction: card.onAction,
    badges: [{ label: String(card.value), tone: card.tone }],
  }));
  const selectedCalculatorShellItem = calculatorShellQueue.find((item) => item.id === selectedCalculatorShellId) || calculatorShellQueue[0];
  const calculatorShellQuickActions = [
    { id: "enter-dims", label: "Enter Dims", icon: "calculator", onClick: focusCalculatorInput },
    { id: "save-job", label: "Save Job", icon: "briefcase", disabled: !resultReady, onClick: openSaveFromPriority },
    { id: "build-takeoff", label: "Build Takeoff", icon: "plus", onClick: startTakeoffMode },
  ];
  const mobileCalculatorActionCap = 2;
  const mobileCalculatorPriorityCards = showAllMobileCalculatorActions ? calculatorPriorityCards : calculatorPriorityCards.slice(0, mobileCalculatorActionCap);

  function selectCalculatorShellItem(item) {
    setSelectedCalculatorShellId(item?.id || "dimensions");
    item?.onAction?.();
  }

  function renderCalculatorPriorityCard(card) {
    return (
      <button key={card.label} type="button" className="co-toolbox-priority-card co-focus-ring" data-tone={card.tone} onClick={card.onAction}>
        <span className="co-toolbox-priority-icon"><Icon name={card.icon} className="h-4 w-4" /></span>
        <span className="min-w-0">
          <span className="co-toolbox-priority-value">{card.value}</span>
          <span className="co-toolbox-priority-label">{card.label}</span>
          <span className="co-toolbox-priority-helper">{card.helper}</span>
        </span>
        <span className="co-toolbox-priority-action">{card.actionLabel} -&gt;</span>
      </button>
    );
  }

  function renderCalculatorWorkbench() {
    return (
      <>
        <CalculatorInputPanelPolished
          calculatorMode={calculatorMode}
          calculatorType={calculatorType}
          setCalculatorType={setCalculatorType}
          activeFields={activeFields}
          activeDraft={activeDraft}
          sectionForm={sectionForm}
          takeoffSections={takeoffSections}
          editingSectionId={editingSectionId}
          updateSectionForm={updateSectionForm}
          updateField={updateField}
          wastePreset={wastePreset}
          setWastePreset={setWastePreset}
          customWastePercent={customWastePercent}
          setCustomWastePercent={setCustomWastePercent}
          activeWastePercent={activeWastePercent}
          addOrUpdateSection={addOrUpdateSection}
          resetSectionBuilder={resetSectionBuilder}
          resetCalculator={resetCalculator}
          copyResult={copyResult}
          resultCopied={resultCopied}
          result={result}
          setSavePanelOpen={setSavePanelOpen}
          setSaveMessage={setSaveMessage}
        />
        <CalculatorSavePanelPolished savePanelOpen={savePanelOpen} allowedJobs={allowedJobs} saveDraft={saveDraft} setSaveDraft={setSaveDraft} handleSaveResult={handleSaveResult} busy={busy} setSavePanelOpen={setSavePanelOpen} saveMessage={saveMessage} isFieldTool={isFieldTool} />
        <CalculatorTakeoffSectionsPolished calculatorMode={calculatorMode} takeoffSections={takeoffSections} editSection={editSection} duplicateSection={duplicateSection} removeSection={removeSection} />
        <CalculatorSummaryPanelPolished result={result} calculatorMode={calculatorMode} isFieldTool={isFieldTool} />
      </>
    );
  }

  if (canUseCalculatorCommandShell) {
    return (
      <div className="co-office-page co-toolbox-page co-calculator-page co-calculator-shell-page">
        <ApexOfficeCommandShell
          eyebrow="Tools"
          title="Concrete Calculator"
          description="Calculate concrete yield, build multi-section takeoffs, copy field-ready totals, and save internal results to allowed jobs."
          className="co-calculator-command-shell"
          kpis={calculatorKpis}
          queue={{
            title: "Calculation workflow",
            description: "Work top-to-bottom: dimensions, live result, internal job save, then takeoff when needed.",
            items: calculatorShellQueue,
            selectedId: selectedCalculatorShellItem.id,
            onSelect: selectCalculatorShellItem,
            limit: 4,
            controls: (
              <div className="co-calculator-shell-mode-control">
                <CalculatorModeTabsPolished calculatorMode={calculatorMode} setCalculatorMode={setCalculatorMode} onModeChange={changeCalculatorMode} />
              </div>
            ),
            emptyState: <StateCard title="Calculator ready" description="Choose a workflow step to start a calculation." tone="slate" />,
          }}
          detail={{
            title: selectedCalculatorShellItem?.title || "Calculator",
            item: selectedCalculatorShellItem,
            emptyState: <StateCard title="No calculator step selected" description="Choose dimensions, result, save, or takeoff." tone="slate" />,
          }}
          quickActions={calculatorShellQuickActions}
        >
          <div className="co-calculator-shell-detail-scroll">
            {renderCalculatorWorkbench()}
          </div>
        </ApexOfficeCommandShell>
      </div>
    );
  }

  return (
    <div className={`co-office-page co-toolbox-page co-calculator-page ${isFieldTool ? "co-field-tool-page" : ""}`}>
      <PageHeader
        eyebrow={isFieldTool ? "Field Tools" : "Tools"}
        title={isFieldTool ? "Field Calculator" : "Concrete Calculator"}
        description={isFieldTool ? "Calculate yield, build takeoffs, copy totals, and save allowed job records." : "Calculate concrete yield, build multi-section takeoffs, copy field-ready totals, and save internal results to allowed jobs."}
        actions={isFieldTool ? null : (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={copyResult} disabled={result.status !== "ready"}>{resultCopied ? "Copied" : "Copy Result"}</Button>
            <Button type="button" onClick={() => { setSavePanelOpen((current) => !current); setSaveMessage(""); }} disabled={result.status !== "ready"}>Save to Job</Button>
          </div>
        )}
      />

      <CalculatorMobileFocusPanel
        calculatorMode={calculatorMode}
        calculatorType={calculatorType}
        activeFields={activeFields}
        enteredDimensionCount={enteredDimensionCount}
        result={result}
        allowedJobs={allowedJobs}
        resultCopied={resultCopied}
        onFocusInput={focusCalculatorInput}
        onCopyResult={copyFromPriority}
        onSaveResult={openSaveFromPriority}
        onStartTakeoff={startTakeoffMode}
        onModeChange={changeCalculatorMode}
      />

      {isFieldTool ? (
        <CalculatorFieldOperatorPanel
          calculatorMode={calculatorMode}
          calculatorType={calculatorType}
          activeFields={activeFields}
          enteredDimensionCount={enteredDimensionCount}
          result={result}
          allowedJobs={allowedJobs}
          resultCopied={resultCopied}
          onFocusInput={focusCalculatorInput}
          onCopyResult={copyFromPriority}
          onSaveResult={openSaveFromPriority}
          onStartTakeoff={startTakeoffMode}
        />
      ) : null}

      <div className="co-toolbox-kpi-grid mx-auto grid w-full max-w-[1520px] min-w-0 grid-cols-1 gap-3 px-5 pb-3 sm:px-6 md:grid-cols-4 lg:px-6">
        {calculatorKpis.map((item) => <CommandCenterKpiCard key={item.label} item={item} />)}
      </div>

      {!isFieldTool ? (
        <div className="co-toolbox-priority-grid co-calculator-priority-desktop mx-auto w-full max-w-[1520px] min-w-0 gap-3 px-5 pb-3 sm:px-6 md:grid-cols-2 xl:grid-cols-4 lg:px-6">
          {calculatorPriorityCards.map(renderCalculatorPriorityCard)}
        </div>
      ) : null}

      <div className="co-toolbox-priority-grid co-calculator-priority-mobile mx-auto w-full max-w-[1520px] min-w-0 gap-3 px-5 pb-3 sm:px-6 lg:px-6">
        {mobileCalculatorPriorityCards.map(renderCalculatorPriorityCard)}
        {calculatorPriorityCards.length > mobileCalculatorActionCap ? (
          <Button type="button" size="sm" variant="secondary" onClick={() => setShowAllMobileCalculatorActions((current) => !current)}>
            {showAllMobileCalculatorActions ? "Show fewer actions" : "Show save and takeoff"}
          </Button>
        ) : null}
      </div>

      <div className="co-calculator-workflow-wrap mx-auto w-full max-w-[1520px] px-5 pb-3 sm:px-6 lg:px-6">
        <Card className="co-calculator-workflow-card p-3">
          <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Calculation workflow</p>
              <p className="co-calculator-workflow-description mt-1 text-sm font-bold text-slate-600">Switch between a quick single pour and a multi-section takeoff without changing the calculator math.</p>
            </div>
            <CalculatorModeTabsPolished calculatorMode={calculatorMode} setCalculatorMode={setCalculatorMode} onModeChange={changeCalculatorMode} />
          </div>
        </Card>
      </div>

      <div className={`co-toolbox-command-layout co-calculator-command-layout mx-auto grid w-full max-w-[1520px] min-w-0 gap-3 px-5 pb-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-6 ${isFieldTool ? "co-calculator-field-command-layout" : ""}`}>
        <div className="min-w-0 space-y-3">
          {renderCalculatorWorkbench()}
        </div>

        {isFieldTool ? (
          <CalculatorFieldCommandRailPolished
            result={result}
            calculatorMode={calculatorMode}
            takeoffSections={takeoffSections}
            allowedJobs={allowedJobs}
            resultCopied={resultCopied}
            onFocusInput={focusCalculatorInput}
            onCopyResult={copyFromPriority}
            onSaveResult={openSaveFromPriority}
            onStartTakeoff={startTakeoffMode}
          />
        ) : (
          <CalculatorResultRailPolished result={result} calculatorMode={calculatorMode} takeoffSections={takeoffSections} resultCopied={resultCopied} onFocusInput={focusCalculatorInput} onCopyResult={copyFromPriority} onSaveResult={openSaveFromPriority} onStartTakeoff={startTakeoffMode} />
        )}
      </div>
    </div>
  );
}

function CalculatorPage({ jobs, selectedJob, busy, onSaveCalculatorResult, permissions, user }) {
  const [calculatorMode, setCalculatorMode] = useState("single");
  const [calculatorType, setCalculatorType] = useState("slab");
  const [draftByType, setDraftByType] = useState(CALCULATOR_INPUT_DEFAULTS);
  const [takeoffSections, setTakeoffSections] = useState([]);
  const [sectionForm, setSectionForm] = useState(INITIAL_TAKEOFF_SECTION_FORM);
  const [editingSectionId, setEditingSectionId] = useState("");
  const [wastePreset, setWastePreset] = useState("10");
  const [customWastePercent, setCustomWastePercent] = useState("");
  const [resultCopied, setResultCopied] = useState(false);
  const [savePanelOpen, setSavePanelOpen] = useState(false);
  const [saveDraft, setSaveDraft] = useState(INITIAL_CALCULATOR_SAVE_FORM);
  const [saveMessage, setSaveMessage] = useState("");
  const activeDraft = draftByType[calculatorType] || CALCULATOR_INPUT_DEFAULTS.slab;
  const activeWastePercent = wastePreset === "custom" ? customWastePercent : wastePreset;
  const activeFields = CALCULATOR_FIELD_CONFIG[calculatorType] || [];
  const allowedJobs = useMemo(() => deriveAllowedCalculatorJobs(jobs, user, permissions), [jobs, permissions, user]);
  const singleResult = useMemo(
    () => calculateConcreteResult(calculatorType, activeDraft, activeWastePercent),
    [activeDraft, activeWastePercent, calculatorType],
  );
  const takeoffResult = useMemo(
    () => calculateTakeoffResult(takeoffSections, activeWastePercent),
    [activeWastePercent, takeoffSections],
  );
  const result = calculatorMode === "multi_section" ? takeoffResult : singleResult;
  const enteredDimensionCount = activeFields.filter((field) => String(activeDraft[field.key] ?? "").trim() !== "").length;
  const calculatorKpis = [
    { label: "Sections", value: calculatorMode === "multi_section" ? takeoffSections.length : 1, helper: calculatorMode === "multi_section" ? "Takeoff sections added" : "Single calculation mode", icon: "calculator", tone: "blue" },
    { label: "Inputs", value: enteredDimensionCount, helper: `${activeFields.length} dimensions needed`, icon: "layers", tone: enteredDimensionCount === activeFields.length ? "green" : "slate" },
    { label: "Waste %", value: Number(activeWastePercent || 0), helper: "Concrete waste factor", icon: "refresh", tone: Number(activeWastePercent || 0) > 0 ? "amber" : "slate" },
    { label: "Ready", value: result.status === "ready" ? 1 : 0, helper: result.status === "ready" ? "Can copy or save" : "Waiting on valid dimensions", icon: "check", tone: result.status === "ready" ? "green" : "slate" },
  ];
  const isFieldTool = !permissions?.jobs?.canManageAll && !permissions?.leads?.canView;

  useEffect(() => {
    const preferredJobId = selectedJob?.id && allowedJobs.some((job) => job.id === selectedJob.id)
      ? selectedJob.id
      : allowedJobs[0]?.id || "";
    setSaveDraft((current) => {
      if (current.jobId && allowedJobs.some((job) => job.id === current.jobId)) return current;
      return {
        ...current,
        jobId: preferredJobId,
      };
    });
  }, [allowedJobs, selectedJob?.id]);

  useEffect(() => {
    if (result.status !== "ready") {
      setSavePanelOpen(false);
      setSaveMessage("");
    }
  }, [result.status]);

  function updateField(key, value) {
    setDraftByType((current) => ({
      ...current,
      [calculatorType]: {
        ...(current[calculatorType] || {}),
        [key]: value,
      },
    }));
  }

  function updateSectionForm(key, value) {
    setSectionForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function resetSectionBuilder(clearType = false) {
    setSectionForm(INITIAL_TAKEOFF_SECTION_FORM);
    setEditingSectionId("");
    setDraftByType((current) => ({
      ...current,
      [clearType ? "slab" : calculatorType]: { ...CALCULATOR_INPUT_DEFAULTS[clearType ? "slab" : calculatorType] },
    }));
    if (clearType) {
      setCalculatorType("slab");
    }
  }

  function resetCalculator() {
    if (calculatorMode === "multi_section") {
      setTakeoffSections([]);
      resetSectionBuilder();
    } else {
      setDraftByType((current) => ({
        ...current,
        [calculatorType]: { ...CALCULATOR_INPUT_DEFAULTS[calculatorType] },
      }));
    }
    setWastePreset("10");
    setCustomWastePercent("");
    setResultCopied(false);
    setSavePanelOpen(false);
    setSaveDraft((current) => ({
      ...INITIAL_CALCULATOR_SAVE_FORM,
      jobId: current.jobId,
    }));
    setSaveMessage("");
  }

  function addOrUpdateSection() {
    const sectionResult = calculateConcreteResult(calculatorType, activeDraft, 0);
    if (sectionResult.status !== "ready") return;

    const nextSection = createTakeoffSection({
      id: editingSectionId || createCalculatorSectionId(),
      label: sectionForm.label || defaultTakeoffSectionLabel(takeoffSections.length),
      calculatorType,
      inputs: activeDraft,
      notes: sectionForm.notes,
    });

    setTakeoffSections((current) => {
      if (editingSectionId) {
        return current.map((section) => (section.id === editingSectionId ? nextSection : section));
      }
      return [...current, nextSection];
    });
    setResultCopied(false);
    setSaveMessage("");
    resetSectionBuilder();
  }

  function editSection(section) {
    if (!section) return;
    setEditingSectionId(section.id);
    setCalculatorType(section.calculatorType === "round_column" ? "roundColumn" : section.calculatorType);
    setSectionForm({
      label: section.label || "",
      notes: section.notes || "",
    });
    setDraftByType((current) => ({
      ...current,
      [section.calculatorType === "round_column" ? "roundColumn" : section.calculatorType]: {
        ...(section.inputs || {}),
      },
    }));
  }

  function removeSection(sectionId) {
    setTakeoffSections((current) => current.filter((section) => section.id !== sectionId));
    if (editingSectionId === sectionId) {
      resetSectionBuilder();
    }
    setResultCopied(false);
    setSaveMessage("");
  }

  function duplicateSection(section) {
    if (!section) return;
    setTakeoffSections((current) => [
      ...current,
      {
        ...section,
        id: createCalculatorSectionId(),
        label: `${section.label || defaultTakeoffSectionLabel(current.length)} copy`,
      },
    ]);
    setResultCopied(false);
    setSaveMessage("");
  }

  async function copyResult() {
    const copyText = buildCalculatorCopyText(result);
    if (!copyText) return;

    try {
      await navigator.clipboard.writeText(copyText);
      setResultCopied(true);
      window.setTimeout(() => setResultCopied(false), 1500);
    } catch {
      setResultCopied(false);
    }
  }

  async function handleSaveResult() {
    const selectedSaveJob = allowedJobs.find((job) => job.id === saveDraft.jobId);
    if (result.status !== "ready" || !selectedSaveJob || !onSaveCalculatorResult) return;
    const success = await onSaveCalculatorResult({
      jobId: selectedSaveJob.id,
      calculatorType: calculatorMode === "multi_section" ? "multi_section" : calculatorType,
      inputsJson: calculatorMode === "multi_section"
        ? result.inputsJson
        : {
          mode: "single",
          calculatorType,
          inputs: result.normalizedInputs,
        },
      wastePercent: result.wastePercent,
      cubicFeet: result.baseCubicFeet,
      cubicYards: result.baseCubicYards,
      cubicYardsWithWaste: result.cubicYardsWithWaste,
      summary: result.summary,
      notes: saveDraft.notes,
    });
    if (success) {
      setSaveMessage("Saved to job.");
      setSavePanelOpen(false);
      setSaveDraft((current) => ({
        ...current,
        notes: "",
      }));
    }
  }

  return (
    <CalculatorPagePolished
      calculatorMode={calculatorMode}
      setCalculatorMode={setCalculatorMode}
      calculatorType={calculatorType}
      setCalculatorType={setCalculatorType}
      activeDraft={activeDraft}
      activeFields={activeFields}
      sectionForm={sectionForm}
      takeoffSections={takeoffSections}
      editingSectionId={editingSectionId}
      updateSectionForm={updateSectionForm}
      updateField={updateField}
      wastePreset={wastePreset}
      setWastePreset={setWastePreset}
      customWastePercent={customWastePercent}
      setCustomWastePercent={setCustomWastePercent}
      activeWastePercent={activeWastePercent}
      result={result}
      calculatorKpis={calculatorKpis}
      addOrUpdateSection={addOrUpdateSection}
      resetSectionBuilder={resetSectionBuilder}
      resetCalculator={resetCalculator}
      copyResult={copyResult}
      resultCopied={resultCopied}
      savePanelOpen={savePanelOpen}
      setSavePanelOpen={setSavePanelOpen}
      saveMessage={saveMessage}
      setSaveMessage={setSaveMessage}
      allowedJobs={allowedJobs}
      saveDraft={saveDraft}
      setSaveDraft={setSaveDraft}
      handleSaveResult={handleSaveResult}
      isFieldTool={isFieldTool}
      busy={busy}
      editSection={editSection}
      duplicateSection={duplicateSection}
      removeSection={removeSection}
    />
  );
}

export { CalculatorPage };
