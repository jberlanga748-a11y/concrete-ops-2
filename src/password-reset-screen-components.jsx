import { Button, InputField } from "./app-shell-components";
import { APP_NAME } from "./brand-utils";

export function PasswordResetScreen({
  draft,
  setDraft,
  onRequestReset,
  onCompleteReset,
  onBackToLogin,
  loading,
  error,
  successMessage,
  tokenPresent,
  brandAssets = {},
}) {
  const isCompleteMode = tokenPresent;
  return (
    <div className="co-login-screen">
      <div className="co-login-shell">
        <section className="co-login-hero" aria-label="Apex HQ password reset brand">
          <img className="co-login-hero-art" src={brandAssets.loginLogo} alt="" />
          <div className="co-login-hero-shade" aria-hidden="true" />
        </section>
        <section className="co-login-panel" aria-label="Reset Apex HQ password">
          <div className="co-login-panel-head">
            <div className="co-login-icon-tile">
              <img src={brandAssets.loginIcon} alt="" />
            </div>
            <div className="min-w-0">
              <img className="co-login-wordmark-transparent" src={brandAssets.wordmarkTransparent} alt={APP_NAME} />
            </div>
          </div>

          <div className="co-login-form-intro">
            <p>{isCompleteMode ? "Set new password" : "Reset password"}</p>
            <span>
              {isCompleteMode
                ? "Choose a new password for your Apex HQ login."
                : "Enter your account email. If it has access, Apex HQ will accept the reset request."}
            </span>
          </div>

          <form className="co-login-form" onSubmit={isCompleteMode ? onCompleteReset : onRequestReset}>
            {isCompleteMode ? (
              <>
                <InputField label="New password" type="password" value={draft.password} onChange={(event) => setDraft((current) => ({ ...current, password: event.target.value }))} />
                <InputField label="Confirm password" type="password" value={draft.confirmPassword} onChange={(event) => setDraft((current) => ({ ...current, confirmPassword: event.target.value }))} />
              </>
            ) : (
              <InputField label="Email" type="email" value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} />
            )}
            {successMessage ? <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">{successMessage}</p> : null}
            {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</p> : null}
            <Button type="submit" size="lg" disabled={loading} className={`co-login-submit ${loading ? "opacity-70" : ""}`}>
              {loading ? "Working..." : isCompleteMode ? "Reset and enter workspace" : "Prepare reset link"}
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
