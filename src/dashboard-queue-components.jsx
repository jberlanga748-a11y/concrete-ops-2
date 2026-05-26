import { Badge, Button, Card, Icon, InputField, SectionHeader, SelectField, StatusBadge } from "./app-shell-components";

export function QueueList({
  items,
  onToggleTask,
  onArchiveTask,
  onRestoreTask,
  onDeleteTask,
  taskDraft,
  setTaskDraft,
  onAddTask,
  disabled,
  formatDateTimeLabel = (value) => value || "Not recorded",
}) {
  const activeItems = items.filter((item) => !item.archivedAt);
  const archivedItems = items.filter((item) => item.archivedAt);
  return (
    <Card className="p-4">
      <SectionHeader title="Today's Queue" description="Only work that actually needs motion right now." />
      <div className="space-y-2">
        {activeItems.map((item) => (
          <div key={item.id} className={`rounded-2xl border p-3 transition ${item.done ? "border-emerald-100 bg-emerald-50/60" : "border-blue-100 bg-white hover:bg-blue-50/50"}`}>
            <div className="flex items-start justify-between gap-3">
              <button type="button" onClick={() => onToggleTask(item.id)} disabled={disabled} className="flex min-w-0 flex-1 items-start gap-3 text-left">
                <span className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border ${item.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-blue-200 bg-white text-transparent"}`}>
                  <Icon name="check" className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <p className={`text-sm font-black ${item.done ? "text-emerald-800 line-through" : "text-slate-950"}`}>{item.title}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">{item.meta}</p>
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Updated {formatDateTimeLabel(item.updatedAt)}</p>
                </div>
              </button>
              <StatusBadge status={item.done ? "Done" : item.status} />
            </div>
            <div className="mt-3 flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => onArchiveTask(item.id)} disabled={disabled}>Archive</Button>
            </div>
          </div>
        ))}
      </div>
      {archivedItems.length > 0 ? (
        <div className="mt-4 space-y-2">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Archived queue</p>
          {archivedItems.slice(0, 3).map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-700">{item.title}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">{item.meta}</p>
                </div>
                <Badge tone="slate">Archived</Badge>
              </div>
              <div className="mt-3 flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => onRestoreTask(item.id)} disabled={disabled}>Restore</Button>
                <Button variant="ghost" size="sm" onClick={() => onDeleteTask(item.id)} disabled={disabled}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
      <form className="mt-4 grid gap-3" onSubmit={onAddTask}>
        <InputField label="Add queue item" value={taskDraft.title} onChange={(event) => setTaskDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Send concrete order" />
        <InputField label="Context" value={taskDraft.meta} onChange={(event) => setTaskDraft((current) => ({ ...current, meta: event.target.value }))} placeholder="Job, customer, or blocker" />
        <div className="flex min-w-0 flex-col items-stretch gap-3 sm:flex-row sm:items-end">
          <SelectField label="Status" value={taskDraft.status} onChange={(event) => setTaskDraft((current) => ({ ...current, status: event.target.value }))}>
            <option>Due today</option>
            <option>Ready</option>
            <option>This week</option>
            <option>Blocked</option>
          </SelectField>
          <Button className="mb-0 sm:mb-0.5 sm:shrink-0" type="submit" disabled={disabled}>
            <Icon name="plus" />
            Add task
          </Button>
        </div>
      </form>
    </Card>
  );
}
