function formatTimestampMetaDate(value) {
  if (!value) return "Not recorded";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not recorded";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

export function ErrorBanner({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div className="mx-5 mt-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-6 lg:mx-8">
      <div className="flex items-start justify-between gap-3">
        <p>{message}</p>
        <button type="button" className="font-black" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  );
}

export function SaveStateText({ saveState, align = "left" }) {
  const palette = {
    idle: "text-slate-400",
    pending: "text-amber-600",
    saving: "text-blue-700",
    saved: "text-emerald-700",
    error: "text-red-700",
  };

  return (
    <p className={`text-xs font-black uppercase tracking-[0.14em] ${palette[saveState.status] || palette.idle} ${align === "right" ? "text-right" : ""}`}>
      {saveState.message}
    </p>
  );
}

export function TimestampMeta({ createdAt, updatedAt }) {
  return (
    <div className="grid gap-2 rounded-2xl border border-blue-100 bg-blue-50/60 p-3 text-xs text-slate-600 md:grid-cols-2">
      <div>
        <p className="font-black uppercase tracking-[0.14em] text-slate-400">Created</p>
        <p className="mt-1 font-bold text-slate-700">{formatTimestampMetaDate(createdAt)}</p>
      </div>
      <div>
        <p className="font-black uppercase tracking-[0.14em] text-slate-400">Last updated</p>
        <p className="mt-1 font-bold text-slate-700">{formatTimestampMetaDate(updatedAt)}</p>
      </div>
    </div>
  );
}
