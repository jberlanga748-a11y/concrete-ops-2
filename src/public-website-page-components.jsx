import { Badge, Button, Icon, InputField, SelectField, TextAreaField } from "./app-shell-components";
import { APP_NAME } from "./brand-utils";
import { PUBLIC_DEMO_WORKFLOW_OPTIONS } from "./public-website-utils";

export function PublicWebsitePage({
  draft,
  setDraft,
  onSubmit,
  onCopyRequest,
  onBackToLogin,
  loading,
  error,
  successMessage,
  preparedSummary,
  mailtoHref,
  copyNotice,
  brandAssets = {},
}) {
  const workflowSteps = [
    ["Lead or estimate", "Keep the opportunity, scope notes, and follow-up visible."],
    ["Job setup", "Turn the work into a cleaner handoff for the office and field."],
    ["Field proof", "Connect photos, reports, tickets, and updates to the job."],
    ["Owner review", "See what is missing, what is ready, and what needs follow-up."],
  ];
  const fitItems = [
    "Concrete, hardscape, excavation, remodel, and small GC teams",
    "Owner-led contractors with active leads, estimates, jobs, or crews",
    "Companies tired of job details living in texts, paper, phones, and memory",
  ];
  const boundaryItems = [
    "No lead guarantees",
    "No accounting or payroll replacement",
    "No automatic email or text sending",
    "No custom build promise before the workflow proves useful",
  ];

  return (
    <div className="co-public-site">
      <header className="co-public-site-nav">
        <button type="button" className="co-public-site-brand" onClick={onBackToLogin}>
          <img src={brandAssets.appLogo} alt={APP_NAME} />
        </button>
        <nav aria-label="Public site navigation">
          <a href="#workflow">Workflow</a>
          <a href="#pilot">Founder pilot</a>
          <a href="#demo-interest">Walkthrough</a>
          <button type="button" onClick={onBackToLogin}>Login</button>
        </nav>
      </header>

      <main>
        <section className="co-public-site-hero">
          <img className="co-public-site-hero-art" src={brandAssets.splash} alt="" />
          <div className="co-public-site-hero-shade" aria-hidden="true" />
          <div className="co-public-site-hero-copy">
            <div className="co-public-site-badges">
              <Badge tone="orange">Founder-led demos</Badge>
              <Badge tone="blue">Controlled pilots</Badge>
            </div>
            <h1>Stop chasing job details.</h1>
            <p>
              Apex HQ keeps estimates, jobs, crews, photos, reports, and follow-ups organized in one contractor command center.
            </p>
            <span>Built from 15 years of concrete field and business experience.</span>
            <div className="co-public-site-actions">
              <a href="#demo-interest" className="co-public-site-primary-action">Book a guided walkthrough</a>
              <a href="#pilot" className="co-public-site-secondary-action">Ask about the founder pilot</a>
            </div>
          </div>
        </section>

        <section className="co-public-site-section co-public-site-problem">
          <div>
            <Badge tone="slate">Contractor operations</Badge>
            <h2>Your jobs should not live in texts and memory.</h2>
          </div>
          <p>
            Most contractors have leads in one place, estimates in another, job photos on phones, crew notes in texts, reports missing, and follow-ups sitting in somebody's head.
          </p>
        </section>

        <section id="workflow" className="co-public-site-section">
          <div className="co-public-site-section-head">
            <Badge tone="blue">One workflow first</Badge>
            <h2>Built around the way contractor work actually moves.</h2>
            <p>Lead/estimate -&gt; job setup -&gt; field handoff -&gt; photo/report proof -&gt; owner review -&gt; follow-up.</p>
          </div>
          <div className="co-public-site-workflow-grid">
            {workflowSteps.map(([title, detail], index) => (
              <article key={title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{title}</strong>
                <p>{detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="pilot" className="co-public-site-section co-public-site-split">
          <div>
            <Badge tone="orange">14-day founder pilot</Badge>
            <h2>Test Apex HQ on one real contractor workflow.</h2>
            <p>
              The pilot is not a full company switch. We pick one workflow, set it up, check in around day 3, and decide around day 10 if it is worth continuing.
            </p>
            <div className="co-public-site-pilot-list">
              {["One kickoff call", "One selected workflow", "Owner/admin setup help", "One field action if needed", "Day-3 check-in", "Day-10 value review"].map((item) => (
                <span key={item}><Icon name="check" />{item}</span>
              ))}
            </div>
          </div>
          <div className="co-public-site-fit-panel">
            <h3>Good first fit</h3>
            {fitItems.map((item) => <p key={item}>{item}</p>)}
            <h3>Not promised</h3>
            {boundaryItems.map((item) => <p key={item}>{item}</p>)}
          </div>
        </section>

        <section id="demo-interest" className="co-public-site-section co-public-site-demo">
          <div className="co-public-site-section-head">
            <Badge tone="green">Manual follow-up</Badge>
            <h2>Want to see if Apex HQ fits your workflow?</h2>
            <p>Send a short walkthrough request for manual founder review. Apex HQ does not send automatic email or SMS.</p>
          </div>

          <form className="co-public-site-form" onSubmit={onSubmit}>
            <div className="sr-only">
              <label htmlFor="public-demo-company-website">Company website</label>
              <input
                id="public-demo-company-website"
                autoComplete="off"
                tabIndex={-1}
                value={draft.honeypot}
                onChange={(event) => setDraft((current) => ({ ...current, honeypot: event.target.value }))}
              />
            </div>
            <div className="co-public-site-form-grid">
              <InputField label="Name" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} disabled={loading} />
              <InputField label="Company" value={draft.company} onChange={(event) => setDraft((current) => ({ ...current, company: event.target.value }))} disabled={loading} />
              <InputField label="Email" type="email" value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} disabled={loading} />
              <InputField label="Phone" value={draft.phone} onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))} disabled={loading} />
              <InputField label="Trade / type of work" value={draft.trade} onChange={(event) => setDraft((current) => ({ ...current, trade: event.target.value }))} disabled={loading} />
              <InputField label="Location / service area" value={draft.location} onChange={(event) => setDraft((current) => ({ ...current, location: event.target.value }))} disabled={loading} />
            </div>
            <SelectField label="Workflow to clean up first" value={draft.workflow} onChange={(event) => setDraft((current) => ({ ...current, workflow: event.target.value }))} disabled={loading}>
              {PUBLIC_DEMO_WORKFLOW_OPTIONS.map((option) => <option key={option}>{option}</option>)}
            </SelectField>
            <TextAreaField label="What is scattered today?" value={draft.message} onChange={(event) => setDraft((current) => ({ ...current, message: event.target.value }))} disabled={loading} />
            <label className="co-public-site-consent">
              <input
                type="checkbox"
                checked={draft.consentToManualFollowUp}
                onChange={(event) => setDraft((current) => ({ ...current, consentToManualFollowUp: event.target.checked }))}
                disabled={loading}
              />
              <span>I am asking for manual founder follow-up about Apex HQ. I understand this does not create an account, send automatic texts/emails, or start billing.</span>
            </label>
            {error ? <p className="co-public-site-error">{error}</p> : null}
            {successMessage ? <p className="co-public-site-success">{successMessage}</p> : null}
            <div className="co-public-site-form-actions">
              <Button type="submit" size="lg" disabled={loading}>{loading ? "Saving request..." : "Submit walkthrough request"}</Button>
              <a className="co-public-site-call-link" href="tel:+15419712741">Call John</a>
            </div>
          </form>

          {preparedSummary ? (
            <div className="co-public-site-prepared">
              <div>
                <Badge tone="green">Saved for manual review</Badge>
                <p>This was saved as a manual review lead. You can still copy the request for a call, text, or email.</p>
              </div>
              <textarea readOnly value={preparedSummary} />
              <div className="co-public-site-form-actions">
                <Button type="button" variant="secondary" onClick={onCopyRequest}>Copy request</Button>
                <a className="co-public-site-call-link" href={mailtoHref}>Open email draft</a>
              </div>
              {copyNotice ? <p className="co-public-site-copy-notice">{copyNotice}</p> : null}
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
