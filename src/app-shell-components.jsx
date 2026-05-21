function iconStrokeProps(className) {
  return {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.1",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
    "aria-hidden": "true",
  };
}

export function Icon({ name, className = "h-4 w-4" }) {
  const common = iconStrokeProps(className);
  const paths = {
    grid: [<path key="1" d="M4 4h7v7H4z" />, <path key="2" d="M13 4h7v7h-7z" />, <path key="3" d="M4 13h7v7H4z" />, <path key="4" d="M13 13h7v7h-7z" />],
    briefcase: [<path key="1" d="M10 6V5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v1" />, <path key="2" d="M3 8h18v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Z" />, <path key="3" d="M3 13h18" />],
    calendar: [<path key="1" d="M8 2v4" />, <path key="2" d="M16 2v4" />, <path key="3" d="M3 9h18" />, <path key="4" d="M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />],
    clock: [<circle key="1" cx="12" cy="12" r="9" />, <path key="2" d="M12 7v5l3 2" />],
    document: [<path key="1" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />, <path key="2" d="M14 2v6h6" />, <path key="3" d="M8 13h8M8 17h6" />],
    upload: [<path key="1" d="M12 16V4" />, <path key="2" d="m7 9 5-5 5 5" />, <path key="3" d="M20 16v4H4v-4" />],
    inbox: [<path key="1" d="M4 4h16l2 10v6H2v-6Z" />, <path key="2" d="M2 14h6l2 3h4l2-3h6" />],
    users: [<path key="1" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />, <circle key="2" cx="9" cy="7" r="4" />, <path key="3" d="M22 21v-2a4 4 0 0 0-3-3.87" />],
    quote: [<path key="1" d="M6 3h12a2 2 0 0 1 2 2v16l-4-3H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />, <path key="2" d="M8 8h8M8 12h6" />],
    refresh: [<path key="1" d="M21 12a9 9 0 0 1-15.5 6.3L3 16" />, <path key="2" d="M3 12A9 9 0 0 1 18.5 5.7L21 8" />, <path key="3" d="M3 16h5v-5M21 8h-5v5" />],
    alert: [<path key="1" d="m12 2 10 18H2Z" />, <path key="2" d="M12 8v5" />, <path key="3" d="M12 17h.01" />],
    clipboard: [<path key="1" d="M9 3h6l1 2h3v17H5V5h3Z" />, <path key="2" d="M9 3h6v4H9z" />, <path key="3" d="M8 12h8M8 16h6" />],
    hardhat: [<path key="1" d="M3 18h18" />, <path key="2" d="M5 18a7 7 0 0 1 14 0" />, <path key="3" d="M9 10V6h6v4" />],
    calculator: [<path key="1" d="M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" />, <path key="2" d="M8 6h8v4H8z" />, <path key="3" d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" />],
    spark: [<path key="1" d="M12 2l1.5 6.5L20 10l-6.5 1.5L12 18l-1.5-6.5L4 10l6.5-1.5Z" />],
    layers: [<path key="1" d="m12 2 9 5-9 5-9-5Z" />, <path key="2" d="m3 12 9 5 9-5" />, <path key="3" d="m3 17 9 5 9-5" />],
    settings: [<circle key="1" cx="12" cy="12" r="3" />, <path key="2" d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1A2 2 0 1 1 4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1A2 2 0 1 1 7.1 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3.1V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 1 1 19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1a2 2 0 1 1 0 4H21a1.7 1.7 0 0 0-1.6 1Z" />],
    plus: [<path key="1" d="M12 5v14" />, <path key="2" d="M5 12h14" />],
    check: [<path key="1" d="m5 13 4 4L19 7" />],
    arrowUpRight: [<path key="1" d="M7 17 17 7" />, <path key="2" d="M9 7h8v8" />],
    database: [<ellipse key="1" cx="12" cy="5" rx="7" ry="3" />, <path key="2" d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5" />, <path key="3" d="M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />],
    lock: [<rect key="1" x="4" y="11" width="16" height="10" rx="2" />, <path key="2" d="M8 11V7a4 4 0 1 1 8 0v4" />],
    bell: [<path key="1" d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />, <path key="2" d="M10 21a2 2 0 0 0 4 0" />],
    help: [<circle key="1" cx="12" cy="12" r="9" />, <path key="2" d="M9.5 9a2.7 2.7 0 0 1 5 1.4c0 1.8-2.5 2.1-2.5 4" />, <path key="3" d="M12 18h.01" />],
  };

  return <svg {...common}>{paths[name] || paths.grid}</svg>;
}

export function WorkQueueCard({
  eyebrow,
  title,
  meta,
  status,
  tone = "orange",
  actionLabel,
  onClick,
  selected = false,
  children,
}) {
  const toneClass = {
    green: "co-work-queue-card--green",
    red: "co-work-queue-card--red",
    blue: "co-work-queue-card--blue",
    slate: "co-work-queue-card--slate",
    amber: "co-work-queue-card--amber",
    orange: "co-work-queue-card--orange",
  }[tone] || "co-work-queue-card--orange";
  const Component = onClick ? "button" : "div";

  return (
    <Component type={onClick ? "button" : undefined} className={`co-work-queue-card ${toneClass}${selected ? " is-selected" : ""}`} onClick={onClick}>
      <div className="co-work-queue-card-head">
        <div className="min-w-0">
          {eyebrow ? <p className="co-work-queue-eyebrow">{eyebrow}</p> : null}
          <h3>{title}</h3>
          {meta ? <p className="co-work-queue-meta">{meta}</p> : null}
        </div>
        {status ? <span className="co-work-queue-status">{status}</span> : null}
      </div>
      {children ? <div className="co-work-queue-body">{children}</div> : null}
      {actionLabel ? <span className="co-work-queue-action">{actionLabel}</span> : null}
    </Component>
  );
}

export function AssistantRail({ title = "Apex Assistant", eyebrow = "Assistant", description, priorities = [], actions = [], className = "" }) {
  return (
    <section className={`co-assistant-rail ${className}`}>
      <div className="co-assistant-rail-head">
        <span>{eyebrow}</span>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {priorities.length > 0 ? (
        <div className="co-assistant-rail-priorities">
          {priorities.map((item) => (
            <div key={item.label} className={`co-assistant-rail-priority co-assistant-rail-priority--${item.tone || "orange"}`}>
              <span>{item.value}</span>
              <p>{item.label}</p>
            </div>
          ))}
        </div>
      ) : null}
      {actions.length > 0 ? (
        <div className="co-assistant-rail-actions">
          {actions.map((action) => (
            <button key={action.label} type="button" onClick={action.onClick} disabled={action.disabled}>
              {action.icon ? <Icon name={action.icon} /> : null}
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function CommandPageFrame({ children, kpis, rail, footer, className = "" }) {
  return (
    <div className={`co-command-page-frame ${className}`}>
      {kpis ? <div className="co-command-page-frame-kpis">{kpis}</div> : null}
      <div className="co-command-page-frame-grid">
        <div className="co-command-page-frame-main">{children}</div>
        {rail ? <aside className="co-command-page-frame-rail">{rail}</aside> : null}
      </div>
      {footer ? <div className="co-command-page-frame-footer">{footer}</div> : null}
    </div>
  );
}

export function EstimateStudioShell({
  options = [],
  selectedOptionId = "",
  onSelectOption,
  children,
  sidebar,
  packetTiles = [],
  assistantActions = [],
}) {
  return (
    <CommandPageFrame
      className="co-estimate-studio-shell"
      rail={sidebar}
      footer={
        <AssistantRail
          eyebrow="Apex Assistant"
          title="Estimate"
          description="Review the packet, missing scope, and foreman handoff without covering the proposal workspace."
          actions={assistantActions}
        />
      }
    >
      <aside className="co-estimate-studio-option-rail" aria-label="Estimate options">
        <div className="co-estimate-studio-option-head">
          <p>Estimate Options</p>
          <span>{options.length} active</span>
        </div>
        <div className="co-estimate-studio-option-list">
          {options.length > 0 ? options.map((option, index) => (
            <WorkQueueCard
              key={option.id}
              eyebrow={`Option ${index + 1}`}
              title={option.title}
              meta={option.meta}
              status={option.status}
              tone={option.tone}
              actionLabel={option.actionLabel}
              selected={selectedOptionId === option.id}
              onClick={() => onSelectOption?.(option.id)}
            />
          )) : (
            <div className="co-estimate-studio-empty-option">Create or select a draft to start the packet.</div>
          )}
        </div>
      </aside>
      <div className="co-estimate-studio-workbench">
        {children}
        {packetTiles.length > 0 ? (
          <section className="co-estimate-studio-packet-preview" aria-label="GC packet preview">
            <div className="co-estimate-studio-packet-head">
              <p>GC Packet Preview</p>
              <span>Customer-safe packet sections</span>
            </div>
            <div className="co-estimate-studio-packet-tiles">
              {packetTiles.map((tile) => (
                <button key={tile.label} type="button" onClick={tile.onClick} disabled={tile.disabled}>
                  <Icon name={tile.icon || "document"} />
                  <span>{tile.label}</span>
                </button>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </CommandPageFrame>
  );
}
