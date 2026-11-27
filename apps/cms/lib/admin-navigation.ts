import type { ComponentType } from "react";
import {
  IconChartBar,
  IconDatabase,
  IconFileText,
  IconHome,
  IconPhoto,
  IconUser,
  IconFileDescription,
  IconBox,
  IconArchive,
  IconBuildingStore,
  IconDeviceTablet,
} from "@tabler/icons-react";
import { ADMIN_ROUTES, type AdminRoute } from "@/lib/admin-routes";
import type { CommerceFeatureKey } from "@/lib/commerce-features";

export type AdminNavigationIcon = ComponentType<{
  className?: string;
  stroke?: number;
}>;

export type AdminNavigationLink = {
  label: string;
  href: AdminRoute;
  icon: AdminNavigationIcon;
  description?: string;
  feature?: CommerceFeatureKey;
};

export type AdminNavigationGroup = {
  label: string;
  href: AdminRoute;
  icon: AdminNavigationIcon;
  links: readonly AdminNavigationLink[];
};

export type CommerceNavigationRole = "admin" | "manager" | "staff";
export const ADMIN_NAVIGATION: readonly AdminNavigationGroup[] = [
  {
    label: "Home",
    href: ADMIN_ROUTES.overview,
    icon: IconHome,
    links: [{ label: "Home", href: ADMIN_ROUTES.overview, icon: IconHome }],
  },
  {
    label: "Orders",
    href: ADMIN_ROUTES.operations.orders,
    icon: IconFileText,
    links: [
      {
        label: "Orders",
        href: ADMIN_ROUTES.operations.orders,
        icon: IconFileText,
        feature: "commerce",
      },
      {
        label: "Draft orders",
        href: ADMIN_ROUTES.operations.orderDrafts,
        icon: IconFileText,
        feature: "commerce",
      },
      {
        label: "Abandoned checkouts",
        href: ADMIN_ROUTES.operations.abandonedCheckouts,
        icon: IconFileText,
        feature: "commerce",
      },
      {
        label: "Purchase orders",
        href: ADMIN_ROUTES.operations.purchaseOrders,
        icon: IconFileText,
        feature: "commerce",
      },
    ],
  },
  {
    label: "Products",
    href: ADMIN_ROUTES.store.products,
    icon: IconBox,
    links: [
      {
        label: "Products",
        href: ADMIN_ROUTES.store.products,
        icon: IconBox,
        feature: "commerce",
      },
      {
        label: "Categories",
        href: ADMIN_ROUTES.store.categories,
        icon: IconArchive,
        feature: "commerce",
      },
      {
        label: "Inventory",
        href: ADMIN_ROUTES.store.inventory,
        icon: IconDatabase,
        feature: "commerce",
      },
      {
        label: "Recycle bin",
        href: ADMIN_ROUTES.store.recycleBin,
        icon: IconArchive,
        feature: "commerce",
      },
    ],
  },
  {
    label: "Customers",
    href: ADMIN_ROUTES.store.customers,
    icon: IconUser,
    links: [
      {
        label: "Customers",
        href: ADMIN_ROUTES.store.customers,
        icon: IconUser,
        feature: "commerce",
      },
    ],
  },
  {
    label: "Content",
    href: ADMIN_ROUTES.store.content,
    icon: IconFileDescription,
    links: [
      {
        label: "Content",
        href: ADMIN_ROUTES.store.content,
        icon: IconFileDescription,
        feature: "content",
      },
      {
        label: "Metaobjects",
        href: ADMIN_ROUTES.store.metaobjects,
        icon: IconDatabase,
        feature: "content",
      },
      {
        label: "Media Manager",
        href: ADMIN_ROUTES.store.files,
        icon: IconPhoto,
        feature: "content",
      },
      {
        label: "Menus",
        href: ADMIN_ROUTES.store.menus,
        icon: IconFileDescription,
        feature: "content",
      },
      {
        label: "Blog posts",
        href: ADMIN_ROUTES.store.articles,
        icon: IconFileText,
        feature: "content",
      },
    ],
  },
  {
    label: "Sales channels",
    href: ADMIN_ROUTES.store.onlineStore,
    icon: IconBuildingStore,
    links: [
      { label: "Online Store", href: ADMIN_ROUTES.store.onlineStore, icon: IconBuildingStore, feature: "content" },
      { label: "Pages", href: ADMIN_ROUTES.store.onlineStorePages, icon: IconFileDescription, feature: "content" },
      { label: "Preferences", href: ADMIN_ROUTES.store.onlineStorePreferences, icon: IconFileDescription, feature: "content" },
      { label: "Point of Sale", href: ADMIN_ROUTES.store.channels, icon: IconDeviceTablet, feature: "commerce" },
      { label: "Devices", href: ADMIN_ROUTES.store.pointOfSaleDevices, icon: IconDeviceTablet, feature: "commerce" },
      { label: "Register sessions", href: ADMIN_ROUTES.store.pointOfSaleRegisterSessions, icon: IconFileText, feature: "commerce" },
      { label: "Settings", href: ADMIN_ROUTES.store.pointOfSaleSettings, icon: IconFileDescription, feature: "commerce" },
    ],
  },
  {
    label: "Analytics",
    href: ADMIN_ROUTES.store.analytics,
    icon: IconChartBar,
    links: [
      {
        label: "Analytics",
        href: ADMIN_ROUTES.store.analytics,
        icon: IconChartBar,
        feature: "analytics",
      },
    ],
  },
] as const;

export const ADMIN_NAVIGATION_LINKS = ADMIN_NAVIGATION.flatMap(
  (group) => group.links,
);

export function getAdminNavigationForFeatures(
  navigation: readonly AdminNavigationGroup[],
  enabledFeatures: ReadonlySet<CommerceFeatureKey>,
) {
  return navigation.flatMap((group) => {
    const links = group.links.filter(
      (link) => !link.feature || enabledFeatures.has(link.feature),
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

export function getAdminRouteFeature(pathname: string) {
  const match = ADMIN_NAVIGATION_LINKS.filter(
    (link) => pathname === link.href || pathname.startsWith(`${link.href}/`),
  ).sort((left, right) => right.href.length - left.href.length)[0];
  return match?.feature || null;
}

const ROUTE_PERMISSION: Partial<Record<AdminRoute, string>> = {
  "/store/content": "content.read",
  "/store/content/files": "catalog.read",
  "/store": "catalog.read",
  "/store/products": "catalog.read",
  "/store/customers": "customers.read",
  "/store/categories": "catalog.read",
  "/store/bin": "catalog.read",
  "/media": "catalog.read",
  "/media/library": "catalog.read",
  "/store/inventory": "inventory.read",
  "/point-of-sales": "orders.read",
  "/point-of-sales/devices": "orders.read",
  "/point-of-sales/register-sessions": "orders.read",
  "/point-of-sales/settings": "orders.read",
  "/online_store": "content.read",
  "/online_store/pages": "content.read",
  "/online_store/preferences": "settings.manage",
  "/store/orders": "orders.read",
  "/transactions": "billing.read",
  "/subscriptions": "billing.read",
  "/disputes": "billing.read",
  "/reports": "reports.read",
  "/analytics": "reports.read",
  "/reports/library": "reports.read",
  "/analytics/live-view": "reports.read",
  "/system/search-console": "reports.read",
  "/settings/users": "team.read",
  "/settings/users/roles": "team.read",
  "/settings/users/security": "team.read",
  "/whats-new": "content.read",
  "/settings": "settings.manage",
  "/devices": "settings.manage",
  "/settings/integrations": "settings.manage",
  "/system/audit-logs": "audit.read",
  "/email-events": "notifications.read",
  "/system/automations": "automations.read",
  "/system/automations/approvals": "automations.read",
  "/notifications": "notifications.read",
  "/notification-reports": "notifications.read",
  "/system/health": "system_health.read",
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

export function getAdminNavigationForRole(
  role: string,
  permissions?: readonly string[] | null,
): readonly AdminNavigationGroup[] {
  if (role === "admin" && permissions == null) return ADMIN_NAVIGATION;
  const allowedSystemLinks: AdminRoute[] =
    role === "manager"
      ? [
          ADMIN_ROUTES.system.emailEvents,
          ADMIN_ROUTES.system.automations,
          ADMIN_ROUTES.system.approvals,
          ADMIN_ROUTES.system.notifications,
          ADMIN_ROUTES.system.systemHealth,
        ]
      : [ADMIN_ROUTES.system.automations, ADMIN_ROUTES.system.notifications];
  const roleNavigation =
    role === "admin"
      ? ADMIN_NAVIGATION
      : ADMIN_NAVIGATION.flatMap((group) => {
          if (group.label !== "System") return [group];
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
  return group.links.some((link) => isAdminRouteActive(pathname, link.href));
}

export function getAdminBreadcrumbs(pathname: string) {
  const salesChannels = [
    {
      parent: ADMIN_ROUTES.store.onlineStore,
      children: [
        ADMIN_ROUTES.store.onlineStorePages,
        ADMIN_ROUTES.store.onlineStorePreferences,
      ],
    },
    {
      parent: ADMIN_ROUTES.store.channels,
      children: [
        ADMIN_ROUTES.store.pointOfSaleDevices,
        ADMIN_ROUTES.store.pointOfSaleRegisterSessions,
        ADMIN_ROUTES.store.pointOfSaleSettings,
      ],
    },
  ];
  const parentGroup = salesChannels.find((item) => item.parent === pathname);
  if (parentGroup) {
    const parent = ADMIN_NAVIGATION_LINKS.find(
      (item) => item.href === parentGroup.parent,
    );
    if (parent) return [parent];
  }
  for (const group of salesChannels) {
    const childHref = group.children.find((href) => href === pathname);
    if (!childHref) continue;
    const parent = ADMIN_NAVIGATION_LINKS.find(
      (item) => item.href === group.parent,
    );
    const child = ADMIN_NAVIGATION_LINKS.find((item) => item.href === childHref);
    if (parent && child) return [parent, child];
  }

  if (
    pathname === ADMIN_ROUTES.operations.analytics ||
    pathname === ADMIN_ROUTES.operations.reportLibrary ||
    pathname === ADMIN_ROUTES.operations.liveView
  ) {
    const analyticsLink =
      pathname === ADMIN_ROUTES.operations.analytics
        ? {
            label: "Analytics",
            href: ADMIN_ROUTES.operations.analytics,
            icon: IconChartBar,
          }
        : ADMIN_NAVIGATION_LINKS.find((item) => item.href === pathname);
    if (analyticsLink) {
      return pathname === ADMIN_ROUTES.operations.analytics
        ? [analyticsLink]
        : [
            {
              label: "Analytics",
              href: ADMIN_ROUTES.operations.analytics,
              icon: IconChartBar,
            },
            analyticsLink,
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
