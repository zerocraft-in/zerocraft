import type { ComponentType } from "react";
import {
  IconBriefcase,
  IconCalendar,
  IconChartBar,
  IconDatabase,
  IconFileText,
  IconHome,
  IconSettings,
  IconShoppingBag,
  IconUsers,
} from "@tabler/icons-react";
import { ADMIN_ROUTES, type AdminRoute } from "@/lib/admin-routes";

export type AdminNavigationIcon = ComponentType<{
  className?: string;
  stroke?: number;
}>;

export type AdminNavigationLink = {
  label: string;
  href: AdminRoute;
  icon: AdminNavigationIcon;
  description?: string;
};

export type AdminNavigationGroup = {
  label: string;
  href: AdminRoute;
  icon: AdminNavigationIcon;
  links: readonly AdminNavigationLink[];
};

export const ADMIN_NAVIGATION: readonly AdminNavigationGroup[] = [
  {
    label: "Overview",
    href: ADMIN_ROUTES.overview,
    icon: IconHome,
    links: [
      { label: "Dashboard", href: ADMIN_ROUTES.overview, icon: IconHome },
    ],
  },
  {
    label: "Studio",
    href: ADMIN_ROUTES.studio.works,
    icon: IconBriefcase,
    links: [
      { label: "Works", href: ADMIN_ROUTES.studio.works, icon: IconBriefcase },
      { label: "Clients", href: ADMIN_ROUTES.studio.clients, icon: IconUsers },
      {
        label: "Appointments",
        href: ADMIN_ROUTES.studio.appointments,
        icon: IconCalendar,
      },
      { label: "Journal", href: ADMIN_ROUTES.studio.blogs, icon: IconFileText },
    ],
  },
  {
    label: "Commerce",
    href: ADMIN_ROUTES.store.overview,
    icon: IconShoppingBag,
    links: [
      { label: "Store overview", href: ADMIN_ROUTES.store.overview, icon: IconHome },
      { label: "Products", href: ADMIN_ROUTES.store.products, icon: IconShoppingBag },
      { label: "Categories", href: ADMIN_ROUTES.store.categories, icon: IconDatabase },
      { label: "Inventory", href: ADMIN_ROUTES.store.inventory, icon: IconDatabase },
      {
        label: "Customization",
        href: ADMIN_ROUTES.store.customization,
        icon: IconSettings,
      },
      { label: "Orders", href: ADMIN_ROUTES.operations.orders, icon: IconFileText },
    ],
  },
  {
    label: "Insights",
    href: ADMIN_ROUTES.operations.reports,
    icon: IconChartBar,
    links: [
      { label: "Reports", href: ADMIN_ROUTES.operations.reports, icon: IconChartBar },
    ],
  },
  {
    label: "System",
    href: ADMIN_ROUTES.system.settings,
    icon: IconSettings,
    links: [
      { label: "Settings", href: ADMIN_ROUTES.system.settings, icon: IconSettings },
    ],
  },
] as const;

export const ADMIN_NAVIGATION_LINKS = ADMIN_NAVIGATION.flatMap(
  (group) => group.links,
);

export function isAdminRouteActive(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
}

export function isAdminNavigationGroupActive(
  pathname: string,
  group: AdminNavigationGroup,
) {
  if (group.href === "/") return pathname === "/";
  return group.links.some((link) => isAdminRouteActive(pathname, link.href));
}

export function getAdminBreadcrumbs(pathname: string) {
  const group = ADMIN_NAVIGATION.find((item) =>
    isAdminNavigationGroupActive(pathname, item),
  );
  const link = group?.links.find((item) => isAdminRouteActive(pathname, item.href));
  if (!group || !link) return [];
  if (group.href === "/") return [link];
  return [{ label: group.label, href: group.href, icon: group.icon }, link];
}
