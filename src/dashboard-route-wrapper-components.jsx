import { shouldRenderCommandCenterForDashboard } from "./app-state-utils";
import { isOwnerAdminMobileCommandUser } from "./owner-admin-mobile-command-utils";
import { useDesktopCommandViewport } from "./viewport-utils";

export function DashboardPage({ components = {}, ...props }) {
  const {
    TodayCommandPage,
    OwnerAdminMobileCommandPage,
    DashboardPagePolished,
  } = components;

  if (props.permissions?.leads?.canView || shouldRenderCommandCenterForDashboard({
    permissions: props.permissions,
    firstOwnerOnboarding: props.firstOwnerOnboarding,
  })) {
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
