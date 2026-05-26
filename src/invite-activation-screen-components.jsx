import { Button, InputField } from "./app-shell-components";
import { APP_NAME } from "./brand-utils";

export function InviteActivationScreen({
  draft,
  setDraft,
  onSubmit,
  onBackToLogin,
  loading,
  error,
  tokenPresent,
  brandAssets = {},
}) {
  return (
    <div className="co-login-screen">
      <div className="co-login-shell">
        <section className="co-login-hero" aria-label="Apex HQ activation brand">
          <img className="co-login-hero-art" src={brandAssets.loginLogo} alt="" />
          <div className="co-login-hero-shade" aria-hidden="true" />
        </section>
        <section className="co-login-panel" aria-label="Activate Apex HQ login">
          <div className="co-login-panel-head">
            <div className="co-login-icon-tile">
              <img src={brandAssets.loginIcon} alt="" />
            </div>
            <div className="min-w-0">
              <img className="co-login-wordmark-transparent" src={brandAssets.wordmarkTransparent} alt={APP_NAME} />
            </div>
          </div>

          <div className="co-login-form-intro">
            <p>Activate login</p>
            <span>Use the full invite link from your owner or admin, then create your own password for this company workspace.</span>
          </div>

          <form className="co-login-form" onSubmit={onSubmit}>
            <InputField label="New password" type="password" autoComplete="new-password" value={draft.password} onChange={(event) => setDraft((current) => ({ ...current, password: event.target.value }))} />
            <InputField label="Confirm password" type="password" autoComplete="new-password" value={draft.confirmPassword} onChange={(event) => setDraft((current) => ({ ...current, confirmPassword: event.target.value }))} />
            <p className="text-xs font-bold leading-5 text-slate-500">Invite links are one-time setup links. If this link is missing, expired, or already used, ask an owner/admin to reissue it from Employees.</p>
            {!tokenPresent ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">This activation link is missing its invite token. Open the full link from your owner/admin or request a new invite.</p> : null}
            {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</p> : null}
            <Button type="submit" size="lg" disabled={loading || !tokenPresent} className={`co-login-submit ${loading ? "opacity-70" : ""}`}>
              {loading ? "Activating..." : "Activate and enter workspace"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onBackToLogin}>
              Back to sign in
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}
