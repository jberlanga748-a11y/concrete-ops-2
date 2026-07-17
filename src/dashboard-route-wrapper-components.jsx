import { shouldRenderCommandCenterForDashboard } from "./app-state-utils";
import { isSimpleFenceMode } from "./navigation-utils";
import { isOwnerAdminMobileCommandUser } from "./owner-admin-mobile-command-utils";
import { useDesktopCommandViewport } from "./viewport-utils";

export function DashboardPage({ components = {}, ...props }) {
  const {
    TodayCommandPage,
    OwnerAdminMobileCommandPage,
    DashboardPagePolished,
    SimpleFenceTodayPage,
  } = components;

  if (shouldRenderCommandCenterForDashboard({
    permissions: props.permissions,
    firstOwnerOnboarding: props.firstOwnerOnboarding,
  })) {
    // Fence-pilot front door: after first-owner setup is done, a Basic fencing
    // workspace gets the calm Today home instead of the command center.
    if (SimpleFenceTodayPage && isSimpleFenceMode(props.companySettings)) {
      return <SimpleFenceTodayPage {...props} />;
    }
    if (isOwnerAdminMobileCommandUser(props.user, props.permissions)) {
      return (
        <>
          <div className="md:hidden">
            <OwnerAdminMobileCommandPage {...props} />
          </div>
          <div className="hidden md:block">
            <TodayCommandPage {...props} />
          </div>
        </>
      );
    }
    return <TodayCommandPage {...props} />;
  }
  return <DashboardPagePolished {...props} />;
}

export function CommandCenterRoutePage({ components = {}, ...props }) {
  const {
    TodayCommandPage,
    OwnerAdminMobileCommandPage,
    CommandCenterPage,
  } = components;
  const canUseDesktopCommandShell = useDesktopCommandViewport(1180);
  const isTabletOrLarger = useDesktopCommandViewport(768);

  if (canUseDesktopCommandShell) {
    return <TodayCommandPage {...props} commandRouteMode />;
  }

  if (!isTabletOrLarger && isOwnerAdminMobileCommandUser(props.user, props.permissions)) {
    return <OwnerAdminMobileCommandPage {...props} />;
  }

  return <CommandCenterPage {...props} />;
}
