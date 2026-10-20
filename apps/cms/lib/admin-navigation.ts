import type { ComponentType } from "react";
import {
  IconBriefcase,
  IconCalendar,
  IconChartBar,
  IconDatabase,
  IconFileText,
  IconHome,
  IconNews,
  IconCreditCard,
  IconSettings,
  IconShoppingBag,
  IconUsersGroup,
  IconUsers,
  IconWorld,
  IconShieldCheck,
  IconMail,
  IconActivity,
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

export type StudioNavigationRole = "admin" | "manager" | "staff";

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
    href: ADMIN_ROUTES.studio.overview,
    icon: IconBriefcase,
    links: [
      { label: "Overview", href: ADMIN_ROUTES.studio.overview, icon: IconBriefcase },
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
    label: "Items & services",
    href: ADMIN_ROUTES.store.overview,
    icon: IconShoppingBag,
    links: [
      { label: "Products", href: ADMIN_ROUTES.store.products, icon: IconShoppingBag },
      { label: "Categories", href: ADMIN_ROUTES.store.categories, icon: IconDatabase },
      { label: "Inventory", href: ADMIN_ROUTES.store.inventory, icon: IconDatabase },
      {
        label: "Customization",
        href: ADMIN_ROUTES.store.customization,
        icon: IconSettings,
      },
    ],
  },
  {
    label: "Payments & invoices",
    href: ADMIN_ROUTES.operations.transactions,
    icon: IconCreditCard,
    links: [
      { label: "Transactions", href: ADMIN_ROUTES.operations.transactions, icon: IconCreditCard },
      { label: "Orders", href: ADMIN_ROUTES.operations.orders, icon: IconFileText },
      { label: "Subscriptions", href: ADMIN_ROUTES.operations.subscriptions, icon: IconFileText },
      { label: "Disputes", href: ADMIN_ROUTES.operations.disputes, icon: IconFileText },
    ],
  },
  {
    label: "Customers",
    href: ADMIN_ROUTES.studio.clients,
    icon: IconUsers,
    links: [{ label: "Customer directory", href: ADMIN_ROUTES.studio.clients, icon: IconUsers }],
  },
  {
    label: "Insights",
    href: ADMIN_ROUTES.operations.reports,
    icon: IconChartBar,
    links: [
      { label: "Sales", href: ADMIN_ROUTES.operations.reports, icon: IconChartBar },
      { label: "Operations", href: ADMIN_ROUTES.operations.reports, icon: IconChartBar },
      { label: "Accounting", href: ADMIN_ROUTES.operations.reports, icon: IconChartBar },
    ],
  },
  {
    label: "Staff",
    href: ADMIN_ROUTES.staff.scheduling,
    icon: IconUsersGroup,
    links: [
      { label: "Scheduling", href: ADMIN_ROUTES.staff.scheduling, icon: IconCalendar },
      { label: "Time tracking", href: ADMIN_ROUTES.staff.timeTracking, icon: IconCalendar },
    ],
  },
  {
    label: "What’s new",
    href: ADMIN_ROUTES.updates.whatsNew,
    icon: IconNews,
    links: [{ label: "Release notes", href: ADMIN_ROUTES.updates.whatsNew, icon: IconNews }],
  },
  {
    label: "System",
    href: ADMIN_ROUTES.system.settings,
    icon: IconSettings,
    links: [
      { label: "Settings", href: ADMIN_ROUTES.system.settings, icon: IconSettings },
      { label: "Device management", href: ADMIN_ROUTES.system.devices, icon: IconSettings },
      { label: "App integrations", href: ADMIN_ROUTES.system.integrations, icon: IconSettings },
      { label: "Audit log", href: ADMIN_ROUTES.system.auditLogs, icon: IconShieldCheck },
      { label: "Email delivery", href: ADMIN_ROUTES.system.emailEvents, icon: IconMail },
      { label: "Automation health", href: ADMIN_ROUTES.system.automations, icon: IconActivity },
      { label: "Notification history", href: ADMIN_ROUTES.system.notifications, icon: IconMail },
      { label: "Weekly reports", href: ADMIN_ROUTES.system.notificationReports, icon: IconFileText },
    ],
  },
  {
    label: "Channels",
    href: ADMIN_ROUTES.store.channels,
    icon: IconWorld,
    links: [{ label: "Storefront", href: ADMIN_ROUTES.store.channels, icon: IconWorld }],
  },
] as const;

export const ADMIN_NAVIGATION_LINKS = ADMIN_NAVIGATION.flatMap(
  (group) => group.links,
);

export function getAdminNavigationForRole(role: string): readonly AdminNavigationGroup[] {
  if (role === "admin") return ADMIN_NAVIGATION;
  const allowedSystemLinks: AdminRoute[] = role === "manager"
    ? [ADMIN_ROUTES.system.emailEvents, ADMIN_ROUTES.system.automations, ADMIN_ROUTES.system.notifications]
    : [ADMIN_ROUTES.system.automations, ADMIN_ROUTES.system.notifications];
  return ADMIN_NAVIGATION.flatMap((group) => {
    if (group.label !== "System") return [group];
    const links = group.links.filter((link) => allowedSystemLinks.includes(link.href));
    return links.length ? [{ ...group, href: links[0].href, links }] : [];
  });
}

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
  const link = group?.links
    .filter((item) => isAdminRouteActive(pathname, item.href))
    .sort((left, right) => right.href.length - left.href.length)[0];
  if (!group || !link) return [];
  if (group.href === link.href) return [link];
  return [{ label: group.label, href: group.href, icon: group.icon }, link];
}
