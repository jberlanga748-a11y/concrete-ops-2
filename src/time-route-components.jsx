import { Icon } from "./app-shell-components";

export function TimeKpiCardPolished({ item }) {
  const tone = item.tone || "orange";
  const rawValue = Number(item.rawValue ?? item.value ?? 0);
  const isEmpty = Number.isFinite(rawValue) ? rawValue <= 0 : false;

  return (
    <div className="co-command-kpi border p-3" data-tone={tone}>
      <div className="co-command-kpi-body">
        <div className="co-command-kpi-icon">
          <Icon name={item.icon} className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className={`co-command-kpi-value ${isEmpty ? "is-empty" : ""}`}>{item.value ?? 0}</p>
          <p className="mt-0.5 break-words text-sm font-black leading-tight text-slate-950">{item.label}</p>
          <p className="mt-0.5 break-words text-xs font-bold leading-[1.35] text-slate-700">{item.helper}</p>
        </div>
      </div>
      {item.actionLabel ? (
        <button type="button" onClick={item.onAction} className="co-command-kpi-link co-focus-ring">
          {item.actionLabel}
          <span aria-hidden="true">-&gt;</span>
        </button>
      ) : null}
    </div>
  );
}
