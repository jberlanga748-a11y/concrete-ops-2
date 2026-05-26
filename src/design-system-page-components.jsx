import { Badge, Button, Card, PageHeader, SectionHeader } from "./app-shell-components";
import { TOKENS } from "./design-system-tokens";

function StateExamples() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="p-5">
        <SectionHeader title="Empty state" />
        <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50 p-6 text-center">
          <p className="font-black text-slate-950">No change orders yet</p>
          <p className="mt-2 text-sm text-slate-500">Create one when scope changes, price changes, or extra work is approved.</p>
          <Button className="mt-4" size="sm">Create Change Order</Button>
        </div>
      </Card>
      <Card className="p-5">
        <SectionHeader title="Loading state" />
        <div className="space-y-3">{[1, 2, 3].map((item) => <div key={item} className="h-12 animate-pulse rounded-2xl bg-blue-50" />)}</div>
      </Card>
      <Card className="p-5">
        <SectionHeader title="Error state" />
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
          <p className="font-black text-red-700">Could not load uploads</p>
          <p className="mt-1 text-sm text-red-600">Check the storage connection and try again.</p>
          <Button variant="secondary" size="sm" className="mt-3">Retry</Button>
        </div>
      </Card>
    </div>
  );
}

export function DesignSystemPage() {
  return (
    <div>
      <PageHeader eyebrow="Design System" title="Apex HQ UI standards" description="The orange, charcoal, and white command-center system stays consistent across office and field tools." actions={<Badge tone="blue">Live spec</Badge>} />
      <div className="grid gap-4 px-5 sm:px-6 lg:px-8">
        <Card className="p-5">
          <SectionHeader title="Tokens" description="Apex orange, charcoal shell, and white workspace surfaces with practical operational density." />
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            {TOKENS.colors.map(([name, value, use]) => (
              <div key={name} className="rounded-2xl border border-blue-100 p-3">
                <div className="h-10 rounded-xl border border-blue-100" style={{ background: value }} />
                <p className="mt-2 text-xs font-black uppercase text-slate-500">{name}</p>
                <p className="text-xs font-bold text-slate-700">{value}</p>
                <p className="mt-1 text-[11px] leading-4 text-slate-500">{use}</p>
              </div>
            ))}
          </div>
        </Card>
        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="p-5">
            <SectionHeader title="Button hierarchy" description="Primary actions move records. Utilities stay secondary." />
            <div className="flex flex-wrap gap-2">
              <Button>Primary Action</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
            </div>
          </Card>
          <Card className="p-5">
            <SectionHeader title="Density guidelines" description="Operational software should feel compact without feeling cramped." />
            <div className="space-y-2">
              {TOKENS.density.map(([name, value, use]) => (
                <div key={name} className="rounded-2xl border border-blue-100 p-3">
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-black text-slate-950">{name}</p>
                    <Badge tone="slate">{value}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{use}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <StateExamples />
      </div>
    </div>
  );
}
