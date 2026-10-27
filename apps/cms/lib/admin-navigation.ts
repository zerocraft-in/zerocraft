import type { ComponentType } from "react";
import {
  IconBriefcase,
  IconCalendar,
  IconChartBar,
  IconDatabase,
  IconFileText,
  IconHome,
  IconCreditCard,
  IconSettings,
  IconShoppingBag,
  IconUsersGroup,
  IconUsers,
  IconShieldCheck,
  IconMail,
  IconActivity,
  IconHeartbeat,
  IconPhoto,
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
export type AdminWorkspaceTab = "studio" | "store";

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
      { label: "Email", href: ADMIN_ROUTES.studio.email, icon: IconMail },
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
    label: "Store",
    href: ADMIN_ROUTES.store.overview,
    icon: IconShoppingBag,
    links: [
      {
        label: "Products",
        href: ADMIN_ROUTES.store.products,
        icon: IconShoppingBag,
      },
      {
        label: "Categories",
        href: ADMIN_ROUTES.store.categories,
        icon: IconDatabase,
      },
      {
        label: "Media library",
        href: ADMIN_ROUTES.store.mediaLibrary,
        icon: IconPhoto,
      },
      {
        label: "Inventory",
        href: ADMIN_ROUTES.store.inventory,
        icon: IconDatabase,
      },
      {
        label: "Customization",
        href: ADMIN_ROUTES.store.customization,
        icon: IconSettings,
      },
    ],
  },
  {
    label: "Payments & invoices",
    href: ADMIN_ROUTES.operations.orders,
    icon: IconCreditCard,
    links: [
      {
        label: "Orders",
        href: ADMIN_ROUTES.operations.orders,
        icon: IconFileText,
      },
    ],
  },
  {
    label: "Insights",
    href: ADMIN_ROUTES.operations.reports,
    icon: IconChartBar,
    links: [
      {
        label: "Reports",
        href: ADMIN_ROUTES.operations.reports,
        icon: IconChartBar,
      },
    ],
  },
  {
    label: "Staff",
    href: ADMIN_ROUTES.staff.team,
    icon: IconUsersGroup,
    links: [
      {
        label: "Team access",
        href: ADMIN_ROUTES.staff.team,
        icon: IconUsersGroup,
      },
    ],
  },
  {
    label: "System",
    href: ADMIN_ROUTES.system.overview,
    icon: IconSettings,
    links: [
      {
        label: "Settings",
        href: ADMIN_ROUTES.system.settings,
        icon: IconSettings,
      },
      {
        label: "Audit log",
        href: ADMIN_ROUTES.system.auditLogs,
        icon: IconShieldCheck,
      },
      {
        label: "Email delivery",
        href: ADMIN_ROUTES.system.emailEvents,
        icon: IconMail,
      },
      {
        label: "Automation health",
        href: ADMIN_ROUTES.system.automations,
        icon: IconActivity,
      },
      {
        label: "Notification history",
        href: ADMIN_ROUTES.system.notifications,
        icon: IconMail,
      },
      {
        label: "Weekly reports",
        href: ADMIN_ROUTES.system.notificationReports,
        icon: IconFileText,
      },
      {
        label: "System health",
        href: ADMIN_ROUTES.system.systemHealth,
        icon: IconHeartbeat,
      },
    ],
  },
] as const;

export const ADMIN_NAVIGATION_LINKS = ADMIN_NAVIGATION.flatMap(
  (group) => group.links,
);

export function getAdminWorkspaceTab(pathname: string): AdminWorkspaceTab {
  const storePrefixes = [
    "/store",
    "/media-library",
    "/orders",
    "/transactions",
    "/subscriptions",
    "/disputes",
    "/reports",
  ];
  return storePrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
    ? "store"
    : "studio";
}

export function getAdminNavigationForWorkspace(
  navigation: readonly AdminNavigationGroup[],
  workspace: AdminWorkspaceTab,
) {
  const storeGroups = new Set(["Store", "Payments & invoices", "Insights"]);
  return navigation.filter((group) =>
    workspace === "store"
      ? storeGroups.has(group.label)
      : !storeGroups.has(group.label),
  );
}

const ROUTE_PERMISSION: Partial<Record<AdminRoute, string>> = {
  "/": "dashboard.read",
  "/works": "content.read",
  "/studio/email": "email.read",
  "/blogs": "content.read",
  "/clients": "clients.read",
  "/appointments": "appointments.read",
  "/store": "catalog.read",
  "/store/products": "catalog.read",
  "/store/categories": "catalog.read",
  "/media-library": "catalog.read",
  "/store/inventory": "inventory.read",
  "/store/customization": "catalog.read",
  "/channels": "catalog.read",
  "/orders": "orders.read",
  "/transactions": "billing.read",
  "/subscriptions": "billing.read",
  "/disputes": "billing.read",
  "/reports": "reports.read",
  "/scheduling": "appointments.read",
  "/time-tracking": "appointments.read",
  "/team": "team.read",
  "/whats-new": "content.read",
  "/settings": "settings.manage",
  "/devices": "settings.manage",
  "/integrations": "settings.manage",
  "/audit-logs": "audit.read",
  "/email-events": "notifications.read",
  "/automations": "automations.read",
  "/notifications": "notifications.read",
  "/notification-reports": "notifications.read",
  "/system-health": "system_health.read",
};

export function getAdminRoutePermission(pathname: string) {
  const match = Object.entries(ROUTE_PERMISSION)
    .filter(
      ([href]) =>
        pathname === href || (href !== "/" && pathname.startsWith(`${href}/`)),
    )
    .sort(([left], [right]) => right.length - left.length)[0];
  return match?.[1] || null;
}

export function getAdminNavigationForRole(role: string, permissions?: readonly string[] | null): readonly AdminNavigationGroup[] {
  if (role === "admin" && permissions == null) return ADMIN_NAVIGATION;
  const allowedSystemLinks: AdminRoute[] =
    role === "manager"
      ? [
          ADMIN_ROUTES.system.emailEvents,
          ADMIN_ROUTES.system.automations,
          ADMIN_ROUTES.system.notifications,
          ADMIN_ROUTES.system.systemHealth,
        ]
      : [ADMIN_ROUTES.system.automations, ADMIN_ROUTES.system.notifications];
  const roleNavigation =
    role === "admin"
      ? ADMIN_NAVIGATION
      : ADMIN_NAVIGATION.flatMap((group) => {
          if (group.label !== "System") {
            if (group.label !== "Staff") return [group];
            const links = group.links.filter(
              (link) => link.href !== ADMIN_ROUTES.staff.team,
            );
            return [{ ...group, href: links[0]?.href || group.href, links }];
          }
          const links = group.links.filter((link) =>
            allowedSystemLinks.includes(link.href),
          );
          return links.length ? [{ ...group, href: links[0].href, links }] : [];
        });
  if (permissions == null) return roleNavigation;
  return roleNavigation.flatMap((group) => {
    const links = group.links.filter(
      (link) =>
        !ROUTE_PERMISSION[link.href] ||
        permissions.includes(ROUTE_PERMISSION[link.href]!),
    );
    if (!links.length) return [];
    return [
      {
        ...group,
        href: links.some((link) => link.href === group.href)
          ? group.href
          : links[0].href,
        links,
      },
    ];
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
