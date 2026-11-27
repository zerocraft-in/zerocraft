"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";

import { type NavGroup, NAV_GROUPS } from "./sidebar/nav";
import { AppSidebar, type AppSidebarData } from "@/components/layout/sidebar";
import { SidebarProvider, SidebarInset } from "@zerocraft/ui/sidebar";
import { TooltipProvider } from "@zerocraft/ui/tooltip";
import { GalleryVerticalEnd, Settings } from "lucide-react";
import { SettingsSidebar } from "./sidebar/settings-sidebar";
import {
  PageHeaderScrollContainerProvider,
} from "@/components/layout/page-header";
import { selectActiveOrganization } from "@/app/(dashboard)/organization/actions";

function readSidebarState(pathname: string): boolean {
  if (typeof document !== "undefined") {
    const cookie = document.cookie
      .split("; ")
      .find((value) => value.startsWith("maara_sidebar_state="))
      ?.split("=")[1];

    if (cookie === "true") return true;
    if (cookie === "false") return false;

    const storedState = window.localStorage.getItem("maara-sidebar-state");
    if (storedState === "true") return true;
    if (storedState === "false") return false;
  }

  return !pathname.startsWith("/products/new");
}

function navGroupToNavItem(group: NavGroup): AppSidebarData["navMain"][number] {
  return {
    title: group.label,
    url: group.href,
    icon: group.icon,
    section: group.section,
    isActive: false,
    items: group.children.map((child) => ({
      title: child.label,
      url: child.href,
    })),
  };
}

export default function DashboardShell({
  children,
  user,
  memberships,
  activeOrganization,
  installedSalesChannelKeys,
}: {
  readonly children: React.ReactNode;
  readonly user?: { id: string; email: string | null };
  readonly memberships?: {
    organizationId: string;
    organizationName: string;
    roleKey: string;
    status: string;
  }[];
  readonly activeOrganization?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  readonly installedSalesChannelKeys?: string[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  // Controlled sidebar open state. Shopify Admin auto-condenses the global
  // nav on Settings routes to make room for the settings secondary sidebar.
  // Shopify's product editor uses the compact global nav to keep the form
  // centered. Keep the wider navigation everywhere else so existing pages do
  // not change their established working layout.
  // Keep the server and first client render identical. Persisted browser
  // state is applied in the effect below after hydration is complete.
  const [sidebarOpen, setSidebarOpen] = React.useState(
    !pathname.startsWith("/products/new"),
  );
  const [sidebarReady, setSidebarReady] = React.useState(false);
  const isSettings =
    (pathname === "/settings" || pathname.startsWith("/settings/"))
  const effectiveSidebarOpen = sidebarOpen && !isSettings;
  const handleSidebarOpenChange = React.useCallback((open: boolean) => {
    setSidebarOpen(open);
    window.localStorage.setItem("maara-sidebar-state", String(open));
  }, []);

  React.useEffect(() => {
    const hydrationId = window.setTimeout(() => {
      setSidebarOpen(readSidebarState(pathname));
      setSidebarReady(true);
    }, 0);

    return () => window.clearTimeout(hydrationId);
  }, [pathname]);

  React.useEffect(() => {
    if (!isSettings) {
      window.sessionStorage.setItem("maara-last-store-route", pathname);
    }
  }, [isSettings, pathname]);

  const sidebarData: AppSidebarData = React.useMemo(() => {
    const teams: AppSidebarData["teams"] = (memberships ?? []).map((m) => ({
      id: m.organizationId,
      name: m.organizationName,
      logo: GalleryVerticalEnd,
      plan: m.roleKey,
    }));

    const installedKeys = new Set(installedSalesChannelKeys ?? []);
    const navMain: AppSidebarData["navMain"] = NAV_GROUPS
      .filter((group) => !group.channelKey || installedKeys.has(group.channelKey))
      .map(navGroupToNavItem);

    const projects: AppSidebarData["projects"] = [];

    const navSecondary: AppSidebarData["navSecondary"] = [
      {
        title: "Settings",
        url: "/settings",
        icon: Settings,
      },
    ];

    const userName =
      user?.email?.split("@")[0] ?? activeOrganization?.name ?? "User";

    const fallbackPlan =
      memberships?.[0]?.roleKey ?? activeOrganization?.name ?? "Member";

    return {
      user: {
        name: activeOrganization?.name ?? userName,
        email: user?.email ?? "",
        avatar: "",
      },
      teams:
        teams.length > 0
          ? teams
          : [
              {
                id: activeOrganization?.id ?? "single-organization",
                name: activeOrganization?.name ?? "My Org",
                logo: GalleryVerticalEnd,
                plan: fallbackPlan,
              },
            ],
      navMain,
      navSecondary,
      projects,
    };
  }, [user, memberships, activeOrganization, installedSalesChannelKeys]);

  const handleOrganizationChange = React.useCallback(
    async (organizationId: string) => {
      const result = await selectActiveOrganization(organizationId);
      if (result.ok) router.refresh();
    },
    [router],
  );

  const headerUser = user
    ? {
        name: user.email?.split("@")[0] ?? activeOrganization?.name ?? "User",
        email: user.email ?? "",
        avatar: null,
      }
    : undefined;

  return (
    <TooltipProvider>
      <SidebarProvider
        open={effectiveSidebarOpen}
        onOpenChange={handleSidebarOpenChange}
        style={{ visibility: sidebarReady ? "visible" : "hidden" }}
      >
        {/* Single persistent global sidebar — no remount flicker between routes. */}
        <AppSidebar
          variant="sidebar"
          collapsible="icon"
          data={sidebarData}
          activeOrganizationId={activeOrganization?.id}
          onOrganizationChange={handleOrganizationChange}
        />

        {/* Settings secondary nav — only on /settings routes. Sits between the
            condensed global nav and the content, like Shopify Admin. */}
        {isSettings && (
          <SettingsSidebar
            user={headerUser}
            organizationName={activeOrganization?.name ?? "Organization"}
            storeName={activeOrganization?.name ?? "MAARA MERCH+"}
          />
        )}

        {/* SidebarInset is the only scroll container (document never scrolls).
            The header stays fixed above the scroll area, like Shopify. */}
        <SidebarInset className="flex h-svh min-h-0 min-w-0 flex-col overflow-hidden bg-[var(--background)]">
          <div
            ref={scrollContainerRef}
            className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain [-ms-overflow-style:none] scrollbar-none [&::-webkit-scrollbar]:hidden"
          >
            <PageHeaderScrollContainerProvider
              scrollContainerRef={scrollContainerRef}
            >
              {children}
            </PageHeaderScrollContainerProvider>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
