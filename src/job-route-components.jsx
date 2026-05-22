import { Badge } from "./app-shell-components";
import { deriveJobPilotHandoffReadiness } from "./job-utils";

export function JobPilotHandoffReadinessCard({ job }) {
  const readiness = deriveJobPilotHandoffReadiness(job);

  return (
    <div className="rounded-3xl border border-orange-100 bg-orange-50/70 p-4">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-black text-slate-950">Field handoff readiness</p>
            <Badge tone={readiness.tone}>{readiness.status}</Badge>
            <Badge tone="slate">{readiness.readyCount} / {readiness.totalCount}</Badge>
          </div>
          <p className="mt-1 text-sm leading-6 text-slate-600">{readiness.summary}</p>
        </div>
        <div className="rounded-2xl border border-orange-100 bg-white px-3 py-2 text-sm font-black text-orange-800">
          {readiness.nextAction}
        </div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {readiness.steps.map((step) => (
          <div key={step.id} className={`rounded-2xl border p-3 ${step.complete ? "border-emerald-100 bg-white" : "border-amber-100 bg-white"}`}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{step.label}</p>
              <Badge tone={step.complete ? "green" : "amber"}>{step.complete ? "Ready" : "Needed"}</Badge>
            </div>
            <p className="mt-2 text-xs font-bold leading-5 text-slate-600">{step.helper}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs font-bold text-slate-500">Pilot path: schedule to field handoff to photo/report proof to owner follow-up. This card does not assign crews, send messages, or change billing.</p>
    </div>
  );
}
