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
  IconTrash,
  IconSparkles,
} from "@tabler/icons-react";
import { ADMIN_ROUTES, type AdminRoute } from "@/lib/admin-routes";
import type { StudioFeatureKey } from "@/lib/studio-features";

export type AdminNavigationIcon = ComponentType<{
  className?: string;
  stroke?: number;
}>;

export type AdminNavigationLink = {
  label: string;
  href: AdminRoute;
  icon: AdminNavigationIcon;
  description?: string;
  feature?: StudioFeatureKey;
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
    label: "Home",
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
      { label: "CRM overview", href: ADMIN_ROUTES.studio.crm, icon: IconUsers, feature: "crm" },
      { label: "Content studio", href: ADMIN_ROUTES.studio.content, icon: IconPhoto, feature: "content" },
      { label: "Metaobjects", href: ADMIN_ROUTES.studio.metaobjects, icon: IconDatabase, feature: "content" },
      { label: "Files", href: ADMIN_ROUTES.studio.files, icon: IconPhoto, feature: "content" },
      { label: "Menus", href: ADMIN_ROUTES.studio.menus, icon: IconFileText, feature: "content" },
      { label: "Blog posts", href: ADMIN_ROUTES.studio.blogPosts, icon: IconFileText, feature: "content" },
      { label: "Works", href: ADMIN_ROUTES.studio.works, icon: IconBriefcase, feature: "content" },
      { label: "Email", href: ADMIN_ROUTES.studio.email, icon: IconMail, feature: "email" },
      { label: "Clients", href: ADMIN_ROUTES.studio.clients, icon: IconUsers, feature: "crm" },
      { label: "Segments", href: ADMIN_ROUTES.studio.segments, icon: IconUsers, feature: "crm" },
      { label: "Companies", href: ADMIN_ROUTES.studio.companies, icon: IconUsers, feature: "crm" },
      { label: "Leads", href: ADMIN_ROUTES.studio.leads, icon: IconUsers, feature: "crm" },
      { label: "Projects", href: ADMIN_ROUTES.studio.projects, icon: IconBriefcase, feature: "content" },
      {
        label: "Appointments",
        href: ADMIN_ROUTES.studio.appointments,
        icon: IconCalendar, feature: "crm",
      },
      { label: "Journal", href: ADMIN_ROUTES.studio.blogs, icon: IconFileText, feature: "content" },
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
        icon: IconShoppingBag, feature: "commerce",
      },
      {
        label: "Categories",
        href: ADMIN_ROUTES.store.categories,
        icon: IconDatabase, feature: "commerce",
      },
      {
        label: "Media library",
        href: ADMIN_ROUTES.store.mediaLibrary,
        icon: IconPhoto, feature: "commerce",
      },
      {
        label: "Recycle bin",
        href: ADMIN_ROUTES.store.recycleBin,
        icon: IconTrash, feature: "commerce",
      },
      {
        label: "Inventory",
        href: ADMIN_ROUTES.store.inventory,
        icon: IconDatabase, feature: "commerce",
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
        icon: IconFileText, feature: "commerce",
      },
    ],
  },
  {
    label: "Insights",
    href: ADMIN_ROUTES.operations.analytics,
    icon: IconChartBar,
    links: [
      {
        label: "Reports",
        href: ADMIN_ROUTES.operations.reportLibrary,
        icon: IconChartBar,
      },
      {
        label: "Live View",
        href: ADMIN_ROUTES.operations.liveView,
        icon: IconChartBar,
      },
      {
        label: "Growth & attribution",
        href: ADMIN_ROUTES.operations.growth,
        icon: IconChartBar, feature: "analytics",
      },
      {
        label: "Search Console",
        href: ADMIN_ROUTES.operations.searchConsole,
        icon: IconChartBar, feature: "search_console",
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
        label: "App integrations",
        href: ADMIN_ROUTES.system.integrations,
        icon: IconSparkles,
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
        icon: IconActivity, feature: "automation",
      },
      {
        label: "Notification history",
        href: ADMIN_ROUTES.system.notifications,
        icon: IconMail, feature: "automation",
      },
      {
        label: "Weekly reports",
        href: ADMIN_ROUTES.system.notificationReports,
        icon: IconFileText, feature: "automation",
      },
      {
        label: "System health",
        href: ADMIN_ROUTES.system.systemHealth,
        icon: IconHeartbeat, feature: "automation",
      },
    ],
  },
] as const;

export const ADMIN_NAVIGATION_LINKS = ADMIN_NAVIGATION.flatMap(
  (group) => group.links,
);

export function getAdminNavigationForFeatures(
  navigation: readonly AdminNavigationGroup[],
  enabledFeatures: ReadonlySet<StudioFeatureKey>,
) {
  return navigation.flatMap((group) => {
    const links = group.links.filter((link) => !link.feature || enabledFeatures.has(link.feature));
    if (!links.length) return [];
    return [{ ...group, href: links.some((link) => link.href === group.href) ? group.href : links[0].href, links }];
  });
}

export function getAdminRouteFeature(pathname: string) {
  const match = ADMIN_NAVIGATION_LINKS
    .filter((link) => pathname === link.href || (link.href !== "/" && pathname.startsWith(`${link.href}/`)))
    .sort((left, right) => right.href.length - left.href.length)[0];
  return match?.feature || null;
}

const ROUTE_PERMISSION: Partial<Record<AdminRoute, string>> = {
  "/": "dashboard.read",
  "/crm": "clients.read",
  "/content": "content.read",
  "/content/metaobjects": "content.read",
  "/content/files": "content.read",
  "/content/menus": "content.read",
  "/content/blog-posts": "content.read",
  "/works": "content.read",
  "/studio/email": "email.read",
  "/blogs": "content.read",
  "/clients": "clients.read",
  "/customers/segments": "clients.read",
  "/customers/companies": "clients.read",
  "/leads": "clients.read",
  "/projects": "content.read",
  "/appointments": "appointments.read",
  "/store": "catalog.read",
  "/store/products": "catalog.read",
  "/store/categories": "catalog.read",
  "/store/bin": "catalog.read",
  "/media-library": "catalog.read",
  "/store/inventory": "inventory.read",
  "/channels": "catalog.read",
  "/orders": "orders.read",
  "/transactions": "billing.read",
  "/subscriptions": "billing.read",
  "/disputes": "billing.read",
  "/reports": "reports.read",
  "/analytics": "reports.read",
  "/reports/library": "reports.read",
  "/analytics/live-view": "reports.read",
  "/growth": "reports.read",
  "/search-console": "reports.read",
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
  if (
    pathname === ADMIN_ROUTES.operations.analytics ||
    pathname === ADMIN_ROUTES.operations.reportLibrary ||
    pathname === ADMIN_ROUTES.operations.liveView
  ) {
    const analyticsLink =
      pathname === ADMIN_ROUTES.operations.analytics
        ? { label: "Analytics", href: ADMIN_ROUTES.operations.analytics, icon: IconChartBar }
        : ADMIN_NAVIGATION_LINKS.find((item) => item.href === pathname);
    if (analyticsLink) {
      return pathname === ADMIN_ROUTES.operations.analytics
        ? [analyticsLink]
        : [
            { label: "Analytics", href: ADMIN_ROUTES.operations.analytics, icon: IconChartBar },
            analyticsLink,
          ];
    }
  }
  if (
    pathname === ADMIN_ROUTES.studio.segments ||
    pathname === ADMIN_ROUTES.studio.companies
  ) {
    const customerLink = ADMIN_NAVIGATION_LINKS.find(
      (item) => item.href === pathname,
    );
    if (customerLink) {
      return [
        {
          label: "Customers",
          href: ADMIN_ROUTES.studio.clients,
          icon: IconUsers,
        },
        customerLink,
      ];
    }
  }
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
