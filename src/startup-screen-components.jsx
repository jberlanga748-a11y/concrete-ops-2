import { Button, Card, Icon, StateCard } from "./app-shell-components";
import { APP_NAME } from "./brand-utils";

const DEFAULT_BRAND_ASSETS = {
  loginLogo: "/brand/apex-login-logo.png",
  loginIcon: "/brand/apex-login-icon.png",
};

export function BrandIntroScreen({ brandAssets = DEFAULT_BRAND_ASSETS }) {
  return (
    <div className="co-brand-intro-screen" role="status" aria-live="polite">
      <img className="co-brand-intro-logo" src={brandAssets.loginLogo || DEFAULT_BRAND_ASSETS.loginLogo} alt={APP_NAME} />
      <div className="co-splash-progress" aria-hidden="true">
        <span />
      </div>
    </div>
  );
}

export function SplashScreen({ label = "Loading Apex HQ...", supportingCopy = "Preparing your contractor command center.", brandAssets = DEFAULT_BRAND_ASSETS }) {
  return (
    <div className="co-splash-screen" role="status" aria-live="polite">
      <div className="co-splash-card">
        <img className="co-splash-icon" src={brandAssets.loginIcon || DEFAULT_BRAND_ASSETS.loginIcon} alt={APP_NAME} />
        <div className="co-splash-progress" aria-hidden="true">
          <span />
        </div>
        <p className="co-splash-label">{label}</p>
        <p className="co-splash-copy">{supportingCopy}</p>
      </div>
    </div>
  );
}

export function LoadingScreen({ label = "Loading workspace...", brandAssets = DEFAULT_BRAND_ASSETS }) {
  return <SplashScreen label={label} supportingCopy="Reconnecting to your Apex HQ workspace." brandAssets={brandAssets} />;
}

export function ModuleLoadingFallback({ active }) {
  const label = active ? active.replace(/([A-Z])/g, " $1").trim() : "workspace";
  return (
    <div className="mx-auto w-full max-w-[1520px] p-4 sm:p-6">
      <StateCard
        title="Loading workspace tools"
        description={`Preparing ${label}.`}
        tone="slate"
      />
    </div>
  );
}

export function StartupFallbackScreen({ message, onRetry, onClearSession }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent p-6">
      <Card className="w-full max-w-lg p-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-red-100 text-red-700">
          <Icon name="alert" className="h-6 w-6" />
        </div>
        <p className="mt-4 text-lg font-black text-slate-950">Workspace startup failed</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {message || "Apex HQ hit a startup problem before the workspace could render."}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onRetry}>Retry startup</Button>
          <Button variant="ghost" onClick={onClearSession}>Return to login</Button>
        </div>
      </Card>
    </div>
  );
}
