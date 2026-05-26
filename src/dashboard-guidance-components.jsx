import { Badge, Button, Card, Icon } from "./app-shell-components";

export function OfficePilotWalkthroughCard({ onOpenCommandCenter, onOpenDrafts, onOpenJobs }) {
  const steps = [
    "Review imported drafts",
    "Match or create customer",
    "Create job",
    "Finish startup checklist",
    "Assign and send to field",
  ];

  return (
    <Card className="border-blue-200 bg-blue-50/80 p-4 shadow-sm">
      <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <Badge tone="blue">Pilot walkthrough</Badge>
          <h3 className="mt-2 text-base font-black text-slate-950">Run the office flow in order</h3>
          <p className="mt-1 text-sm leading-6 text-slate-700">
            For a new contractor walkthrough, start in Command Center and move one job from draft review to field-ready work.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {steps.map((step, index) => (
              <span key={step} className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-blue-800 ring-1 ring-blue-100">
                {index + 1}. {step}
              </span>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button type="button" size="sm" onClick={onOpenCommandCenter}>Open Command Center</Button>
          <Button type="button" size="sm" variant="secondary" onClick={onOpenDrafts}>Imported Drafts</Button>
          <Button type="button" size="sm" variant="secondary" onClick={onOpenJobs}>Jobs</Button>
        </div>
      </div>
    </Card>
  );
}

export function FirstOwnerOnboardingCard({ onboarding, onOpen, onOpenSupport }) {
  const steps = Array.isArray(onboarding?.steps) ? onboarding.steps : [];
  const nextStep = onboarding?.nextStep || steps.find((step) => !step.completed) || null;
  const guidedPlan = onboarding?.guidedPlan || {};
  const phases = Array.isArray(guidedPlan.phases) ? guidedPlan.phases : [];
  const nextActions = Array.isArray(guidedPlan.nextActions) ? guidedPlan.nextActions : steps.filter((step) => !step.completed).slice(0, 3);

  return (
    <Card className="overflow-hidden border-orange-100 bg-white">
      <div className="border-b border-orange-100 bg-orange-50/70 p-4">
        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="orange">First owner setup</Badge>
              <Badge tone={onboarding?.percentComplete >= 80 ? "green" : "amber"}>{onboarding?.percentComplete || 0}% ready</Badge>
            </div>
            <h2 className="mt-2 text-lg font-black text-slate-950">Get this workspace ready for real work</h2>
            <p className="mt-1 text-sm font-bold leading-6 text-slate-600">
              Finish the first few setup actions so estimates, jobs, crews, and field workflows start from a clean operating base.
            </p>
          </div>
          {nextStep ? (
            <Button type="button" size="sm" onClick={() => onOpen?.(nextStep)}>
              {nextStep.actionLabel || "Continue setup"}
            </Button>
          ) : null}
        </div>
      </div>
      <div className="grid gap-3 border-b border-slate-100 bg-white p-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
          <Badge tone="blue">Guided path</Badge>
          <h3 className="mt-2 break-words text-base font-black text-slate-950">{guidedPlan.headline || "Follow the setup path"}</h3>
          <p className="mt-1 break-words text-sm font-bold leading-6 text-slate-600">{guidedPlan.description || "Move through profile, team, first work, and rollout readiness in order."}</p>
          {nextActions.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {nextActions.map((step, index) => (
                <Button key={step.key} type="button" size="sm" variant={index === 0 ? "primary" : "secondary"} onClick={() => onOpen?.(step)}>
                  {index + 1}. {step.actionLabel || step.label}
                </Button>
              ))}
            </div>
          ) : (
            <p className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-700">Setup is ready for managed use. Keep rollout readiness current before adding more users.</p>
          )}
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {phases.map((phase) => (
            <button
              key={phase.id}
              type="button"
              disabled={!phase.actionStep}
              onClick={() => phase.actionStep ? onOpen?.(phase.actionStep) : null}
              className={`rounded-2xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 ${phase.completed ? "border-emerald-100 bg-emerald-50/80" : "border-slate-200 bg-slate-50 hover:border-orange-200 hover:bg-orange-50"} ${phase.actionStep ? "" : "cursor-default"}`}
            >
              <span className="flex items-start justify-between gap-2">
                <span className="min-w-0">
                  <span className="block text-sm font-black text-slate-950">{phase.label}</span>
                  <span className="mt-1 block text-xs font-bold leading-4 text-slate-600">{phase.helper}</span>
                </span>
                <Badge tone={phase.completed ? "green" : "amber"}>{phase.completedCount}/{phase.totalCount}</Badge>
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-6">
        {steps.map((step) => {
          const isNextStep = nextStep?.key === step.key && !step.completed;
          return (
            <button
              key={step.key}
              type="button"
              className={`rounded-2xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 ${
                step.completed
                  ? "border-emerald-100 bg-emerald-50/70 hover:border-emerald-200"
                  : "border-orange-100 bg-white hover:border-orange-200 hover:bg-orange-50"
              }`}
              onClick={() => onOpen?.(step)}
            >
              <span className="mb-2 flex items-center justify-between gap-2">
                <span className="text-sm font-black text-slate-950">{step.label}</span>
                <Badge tone={step.completed ? "green" : isNextStep ? "amber" : "slate"}>{step.completed ? "Done" : isNextStep ? "Next" : "To do"}</Badge>
              </span>
              <span className="block text-xs font-bold leading-5 text-slate-600">{step.description}</span>
            </button>
          );
        })}
      </div>
      <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-3">
        <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-sm font-bold leading-6 text-slate-600">
            Need help during setup? Open Support to copy a clean setup question with your workspace context.
          </p>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => {
              if (typeof onOpenSupport === "function") {
                onOpenSupport(guidedPlan.supportWorkflow || "Setup / onboarding");
                return;
              }
              onOpen?.({ moduleId: "support" });
            }}
          >
            <Icon name="help" />Open Support
          </Button>
        </div>
      </div>
    </Card>
  );
}
