import { Badge, Button, Card, Icon, InputField, SelectField, StateCard, TextAreaField } from "./app-shell-components";
import { APP_NAME } from "./brand-utils";
import { PUBLIC_REQUEST_PROJECT_TYPES } from "./public-estimate-request-form";

export function PublicEstimateRequestPage({
  ...props
}) {
  return <PublicEstimateRequestPagePolished {...props} />;
}

function PublicEstimateRequestPagePolished({
  draft,
  setDraft,
  onSubmit,
  onBackToLogin,
  loading,
  error,
  successMessage,
  backendStatus,
  enabled,
  demoMode,
  setupStatus,
  brandAssets = {},
}) {
  const disabled = !enabled || backendStatus === "offline" || setupStatus.needsSetup;
  const checkingStatus = backendStatus === "checking" || !setupStatus.checked;
  const readyForRequests = !checkingStatus && !disabled;
  const statusTone = checkingStatus ? "blue" : readyForRequests ? "green" : "amber";
  const statusLabel = checkingStatus ? "Checking" : readyForRequests ? "Workspace online" : "Requests paused";

  return (
    <div className="co-public-request-screen">
      <div className="co-public-request-shell">
        <section className="co-public-request-hero" aria-label="Apex HQ public estimate intake">
          <div className="co-public-request-brand">
            <img src={brandAssets.appLogo} alt={APP_NAME} />
          </div>
          <div className="co-public-request-badges">
            <Badge tone="orange">Project estimate intake</Badge>
            {demoMode ? <Badge tone="amber">Demo mode</Badge> : null}
            <Badge tone={statusTone}>{statusLabel}</Badge>
          </div>
          <h1>Start a project request</h1>
          <p>
            Send the office the project basics. No login is required, and the public form keeps customer, job, pricing, crew, and workspace records private.
          </p>

          <div className="co-public-request-steps" aria-label="Request process">
            <div>
              <span>01</span>
              <strong>Project basics</strong>
              <p>Name, contact info, address, type, and notes.</p>
            </div>
            <div>
              <span>02</span>
              <strong>Office review</strong>
              <p>The request arrives as a lead for the Apex HQ team.</p>
            </div>
            <div>
              <span>03</span>
              <strong>Follow-up</strong>
              <p>The office uses your preferred contact method.</p>
            </div>
          </div>

          <div className="co-public-request-guardrails">
            <div>
              <Icon name="lock" />
              <span>Workspace records stay private</span>
            </div>
            <div>
              <Icon name="check" />
              <span>No account needed to request work</span>
            </div>
            <div>
              <Icon name="inbox" />
              <span>Request routes to office follow-up</span>
            </div>
          </div>

          <Button type="button" variant="ghost" className="co-public-request-back" onClick={onBackToLogin}>Back to login</Button>
        </section>

        <Card className="co-public-request-form-card">
          <div className="co-public-request-form-head">
            <div className="co-public-request-form-icon">
              <Icon name="quote" />
            </div>
            <div className="min-w-0">
              <p>Project Request</p>
              <span>Collect the details needed to start office follow-up.</span>
            </div>
          </div>
          <div className="co-public-request-form-summary" aria-label="Helpful request details">
            <div>
              <span>Contact</span>
              <strong>Name, phone, email</strong>
            </div>
            <div>
              <span>Location</span>
              <strong>Project address</strong>
            </div>
            <div>
              <span>Scope</span>
              <strong>Type, notes, timing</strong>
            </div>
          </div>

          {checkingStatus ? (
            <div className="co-public-request-status-panel mt-6">
              <StateCard title="Checking request form" description="Confirming whether the public estimate request flow is enabled for this workspace." tone="blue" />
            </div>
          ) : backendStatus === "offline" ? (
            <div className="co-public-request-status-panel mt-6">
              <StateCard title="Workspace unavailable" description="The public estimate request form needs the Apex HQ workspace to be online." tone="red" />
            </div>
          ) : !enabled ? (
            <div className="co-public-request-status-panel mt-6">
              <StateCard title="Public requests disabled" description="The public estimate request form is turned off for this workspace right now." tone="slate" />
            </div>
          ) : setupStatus.needsSetup ? (
            <div className="co-public-request-status-panel mt-6">
              <StateCard title="Workspace setup required" description="Public requests stay off until the office workspace has an initial admin and lead owner." tone="amber" />
            </div>
          ) : (
            <form className="co-public-request-form" onSubmit={onSubmit}>
              <div className="sr-only">
                <label htmlFor="public-request-company-website">Company website</label>
                <input
                  id="public-request-company-website"
                  name="companyWebsite"
                  autoComplete="off"
                  tabIndex={-1}
                  value={draft.honeypot}
                  onChange={(event) => setDraft((current) => ({ ...current, honeypot: event.target.value }))}
                />
              </div>

              <div className="co-public-request-fieldset">
                <p>Contact</p>
                <InputField label="Name" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Jordan Martinez" disabled={loading} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <InputField label="Phone" value={draft.phone} onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))} placeholder="503-555-0123" disabled={loading} />
                  <InputField label="Email" type="email" value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} placeholder="name@example.com" disabled={loading} />
                </div>
              </div>

              <div className="co-public-request-fieldset">
                <p>Project</p>
                <InputField label="Project address" value={draft.projectAddress} onChange={(event) => setDraft((current) => ({ ...current, projectAddress: event.target.value }))} placeholder="843 Creekside Ave NE, Salem, OR" disabled={loading} />
                <SelectField label="Project type" value={draft.projectType} onChange={(event) => setDraft((current) => ({ ...current, projectType: event.target.value }))} disabled={loading}>
                  {PUBLIC_REQUEST_PROJECT_TYPES.map((option) => <option key={option}>{option}</option>)}
                </SelectField>
                <TextAreaField label="Project details" value={draft.projectDetails} onChange={(event) => setDraft((current) => ({ ...current, projectDetails: event.target.value }))} placeholder="Tell us what needs to be built, repaired, replaced, or reviewed." disabled={loading} />
              </div>

              <div className="co-public-request-fieldset">
                <p>Follow-up</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <SelectField label="Preferred contact method" value={draft.preferredContactMethod} onChange={(event) => setDraft((current) => ({ ...current, preferredContactMethod: event.target.value }))} disabled={loading}>
                    {["Phone", "Text", "Email"].map((option) => <option key={option}>{option}</option>)}
                  </SelectField>
                  <InputField label="Preferred contact time" value={draft.preferredContactTime} onChange={(event) => setDraft((current) => ({ ...current, preferredContactTime: event.target.value }))} placeholder="Weekday afternoons" disabled={loading} />
                </div>
              </div>

              {error ? <p className="rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
              {successMessage ? <p className="rounded-2xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{successMessage}</p> : null}
              <Button type="submit" size="lg" className="co-public-request-submit" disabled={loading || disabled}>
                {loading ? "Sending request..." : "Request estimate"}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
