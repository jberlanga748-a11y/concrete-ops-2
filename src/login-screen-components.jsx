import { Badge, Button, InputField } from "./app-shell-components";
import { APP_NAME } from "./brand-utils";

export function LoginScreen({
  credentials,
  setCredentials,
  onSubmit,
  loading,
  error,
  backendStatus,
  setupStatus,
  setupDraft,
  setSetupDraft,
  onSetupSubmit,
  signupDraft,
  setSignupDraft,
  onSignupSubmit,
  showSignup,
  setShowSignup,
  onOpenPasswordReset,
  onOpenPublicWebsite,
  onOpenPublicEstimateRequest,
  brandAssets = {},
  demoLoginPresets = [],
  requestedRoute = "",
  SplashScreenComponent = null,
}) {
  const backendTone = backendStatus === "online" ? "green" : backendStatus === "offline" ? "red" : "amber";
  const backendLabel = backendStatus === "online" ? "Workspace online" : backendStatus === "offline" ? "Workspace offline" : "Checking workspace";
  const isSetupMode = backendStatus === "online" && setupStatus.checked && setupStatus.needsSetup;
  const isSignupMode = !isSetupMode && showSignup && setupStatus.publicSignupEnabled;
  void requestedRoute;
  const canShowDemoCredentials = setupStatus.demoMode && setupStatus.demoUserExists && !isSetupMode;
  const heroKickerLabel = isSignupMode ? "Self-serve workspace" : "Founder-led demo workspace";
  const heroKickerStatus = isSignupMode ? "Owner setup ready" : "Guided pilot ready";
  const heroTitle = isSignupMode ? "Build your contractor command center" : "Apex HQ demo command";
  const heroDescription = isSignupMode
    ? "Create the company workspace, confirm services, invite the crew, and start the first lead-to-job workflow from one guided setup path."
    : "Open the workspace as office leadership or step into field roles to preview the same job day from the crew side.";
  const heroMetrics = isSignupMode
    ? [
        { label: "Workspace", value: "Company, owner, package" },
        { label: "Setup", value: "Profile, services, team" },
        { label: "First work", value: "Lead, estimate, job" },
      ]
    : [
        { label: "Office", value: "Command center, leads, estimates" },
        { label: "Field", value: "Jobs, reports, photos, safety" },
        { label: "Review", value: "Proof, approvals, ready-to-bill" },
      ];
  const heroPath = isSignupMode
    ? ["Company", "Services", "Team", "First estimate", "Field rollout"]
    : ["Lead", "Estimate", "Job", "Field proof", "Owner review"];
  const signupReadinessSteps = [
    { label: "Workspace", detail: "Company, first owner, and scoped session are created together." },
    { label: "Setup path", detail: "Apex HQ opens into profile, services, team, and first work setup." },
    { label: "Safe rollout", detail: "Field users are invited later and stay out of office-only tools." },
  ];
  const fillDemoCredentials = (preset) => {
    if (!canShowDemoCredentials || !preset?.email) return;
    setCredentials({
      email: preset.email,
      password: "",
    });
  };
  if (loading) {
    if (SplashScreenComponent) {
      return (
        <SplashScreenComponent
          label={isSetupMode ? "Setting up Apex HQ..." : "Opening Apex HQ..."}
          supportingCopy={isSetupMode ? "Creating the first workspace admin." : "Checking your account and loading the command center."}
        />
      );
    }
    return (
      <div className="co-splash-screen" role="status" aria-live="polite">
        <p className="co-splash-label">{isSetupMode ? "Setting up Apex HQ..." : "Opening Apex HQ..."}</p>
      </div>
    );
  }

  return (
    <div className="co-login-screen">
      <div className="co-login-shell">
        <section className="co-login-hero" aria-label="Apex HQ login brand">
          <img className="co-login-hero-art" src={brandAssets.loginLogo || ""} alt="" />
          <div className="co-login-hero-shade" aria-hidden="true" />
          <div className="co-login-hero-copy">
            <div className="co-login-hero-kicker">
              <span>{heroKickerLabel}</span>
              <strong>{heroKickerStatus}</strong>
            </div>
            <h1>{heroTitle}</h1>
            <p>{heroDescription}</p>
            <div className="co-login-hero-metrics" aria-label="Demo workflow preview">
              {heroMetrics.map((metric) => (
                <div key={metric.label}>
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                </div>
              ))}
            </div>
            <div className="co-login-workflow-strip" aria-label="Demo path">
              {heroPath.map((item) => <span key={item}>{item}</span>)}
            </div>
          </div>
        </section>
        <section className="co-login-panel" aria-label={isSetupMode ? "Workspace setup" : "Workspace sign in"}>
          <div className="co-login-panel-head">
            <div className="co-login-icon-tile">
              <img src={brandAssets.loginIcon || ""} alt="" />
            </div>
            <div className="min-w-0">
              <img className="co-login-wordmark-transparent" src={brandAssets.wordmarkTransparent || ""} alt={APP_NAME} />
            </div>
          </div>

          <div className="co-login-status-row">
            <span>
              {backendStatus === "online" && !setupStatus.checked
                ? "Checking workspace access."
                : "Workspace status and account access are checked before entry."}
            </span>
            <span className="co-login-status-meta">
              <Badge tone={backendTone}>{backendLabel}</Badge>
            </span>
          </div>

          <div className="co-login-form-intro">
            <p>{isSetupMode ? "Set up workspace" : isSignupMode ? "Create Apex HQ workspace" : "Sign in"}</p>
            <span>
              {isSetupMode
                ? "Create the first admin account for this workspace."
                : isSignupMode
                  ? "Start a real company workspace. You become the first owner, then Apex HQ guides you through setup before adding the crew."
                  : canShowDemoCredentials
                    ? "Use demo logins for demo data, or sign in with your own office account."
                    : "Enter the admin account for this workspace."}
            </span>
          </div>

          {isSignupMode ? (
            <div className="co-login-signup-brief" aria-label="Signup setup preview">
              <div className="co-login-signup-brief-head">
                <span className="co-login-signup-badge">Owner setup</span>
                <strong>From signup to first job without guessing what comes next.</strong>
                <span>No card is charged in this setup flow. Security, company isolation, and role protection stay included for every workspace.</span>
              </div>
              <div className="co-login-signup-steps">
                {signupReadinessSteps.map((step, index) => (
                  <div key={step.label}>
                    <small>{index + 1}</small>
                    <span>
                      <strong>{step.label}</strong>
                      <em>{step.detail}</em>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {isSetupMode ? (
            <form className="co-login-form" onSubmit={onSetupSubmit}>
              <InputField label="Full name" value={setupDraft.name} onChange={(event) => setSetupDraft((current) => ({ ...current, name: event.target.value }))} />
              <InputField label="Email" type="email" value={setupDraft.email} onChange={(event) => setSetupDraft((current) => ({ ...current, email: event.target.value }))} />
              <InputField label="Password" type="password" value={setupDraft.password} onChange={(event) => setSetupDraft((current) => ({ ...current, password: event.target.value }))} />
              <InputField label="Role" value={setupDraft.role} onChange={(event) => setSetupDraft((current) => ({ ...current, role: event.target.value }))} />
              {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</p> : null}
              <Button type="submit" size="lg" disabled={loading} className={`co-login-submit ${loading ? "opacity-70" : ""}`}>
                {loading ? "Creating admin..." : "Create admin and enter workspace"}
              </Button>
            </form>
          ) : isSignupMode ? (
            <form className="co-login-form" onSubmit={onSignupSubmit}>
              <InputField label="Company name" value={signupDraft.companyName} onChange={(event) => setSignupDraft((current) => ({ ...current, companyName: event.target.value }))} />
              <InputField label="Your name" value={signupDraft.ownerName} onChange={(event) => setSignupDraft((current) => ({ ...current, ownerName: event.target.value }))} />
              <InputField label="Email" type="email" value={signupDraft.email} onChange={(event) => setSignupDraft((current) => ({ ...current, email: event.target.value }))} />
              <InputField label="Phone" type="tel" value={signupDraft.phone} onChange={(event) => setSignupDraft((current) => ({ ...current, phone: event.target.value }))} />
              <InputField label="Password" type="password" value={signupDraft.password} onChange={(event) => setSignupDraft((current) => ({ ...current, password: event.target.value }))} />
              <p className="co-login-field-help">Use at least 10 characters with one letter and one number.</p>
              {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</p> : null}
              <Button type="submit" size="lg" disabled={loading} className={`co-login-submit ${loading ? "opacity-70" : ""}`}>
                {loading ? "Creating workspace..." : "Create company workspace"}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowSignup(false)}>
                Back to sign in
              </Button>
            </form>
          ) : (
            <form className="co-login-form" onSubmit={onSubmit}>
              <InputField label="Email" type="email" value={credentials.email} onChange={(event) => setCredentials((current) => ({ ...current, email: event.target.value }))} />
              <InputField label="Password" type="password" value={credentials.password} onChange={(event) => setCredentials((current) => ({ ...current, password: event.target.value }))} />
              {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</p> : null}
              <Button type="submit" size="lg" disabled={loading} className={`co-login-submit ${loading ? "opacity-70" : ""}`}>
                {loading ? "Signing in..." : "Enter workspace"}
              </Button>
            </form>
          )}

          <div className="co-login-support-grid">
            <div>
              <p>Founder-led demo</p>
              <span>See the public founder-pilot page before signing in. Demo requests stay manual and do not create accounts.</span>
              <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={onOpenPublicWebsite}>View founder pilot</Button>
            </div>
            <div>
              <p>{isSignupMode ? "Already have a workspace?" : "Account help"}</p>
              <span>
                {isSignupMode
                  ? "Return to sign in if your company already has an Apex HQ workspace."
                  : "Use the office account for this workspace, or the shared demo users when opening demo mode."}
              </span>
              {setupStatus.publicSignupEnabled && !isSetupMode && !isSignupMode ? (
                <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={() => setShowSignup(true)}>Create company</Button>
              ) : null}
              {!isSetupMode ? (
                <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={onOpenPasswordReset}>Reset password</Button>
              ) : null}
            </div>
            {setupStatus.publicEstimateRequestEnabled ? (
              <div>
                <p>Public request</p>
                <span>Open the estimate request intake when that workflow is enabled.</span>
                <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={onOpenPublicEstimateRequest}>Open public form</Button>
              </div>
            ) : null}
          </div>

          {canShowDemoCredentials ? (
            <div className="co-login-demo-card">
              <div className="co-login-demo-card-head">
                <div>
                  <p>Demo users</p>
                  <span>Pick the role you want to preview. The button fills the email; enter the shared demo password from the secure runbook.</span>
                </div>
                <Badge tone="orange">No auto-login</Badge>
              </div>
              <div className="co-login-demo-actions" aria-label="Demo login presets">
                {demoLoginPresets.map((preset) => (
                  <button
                    key={preset.email}
                    type="button"
                    className="co-login-demo-preset"
                    onClick={() => fillDemoCredentials(preset)}
                  >
                    <span className="co-login-demo-role-row">
                      <strong>{preset.role}</strong>
                      <em>{preset.startsAt}</em>
                    </span>
                    <span>{preset.email}</span>
                    <small>{preset.helper}</small>
                  </button>
                ))}
              </div>
              <small>Demo access appears only when demo mode is enabled.</small>
            </div>
          ) : null}

          <div className="co-login-quick-tabs" aria-label="Workspace coverage">
            <div>
              <span>Office</span>
              <strong>Leads to jobs</strong>
            </div>
            <div>
              <span>Field</span>
              <strong>Crews and reports</strong>
            </div>
            <div>
              <span>Admin</span>
              <strong>Setup and control</strong>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
