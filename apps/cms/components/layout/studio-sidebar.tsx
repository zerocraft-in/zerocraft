"use client";

import Link from "next/link";
import { IconHelpCircle, IconSettings } from "@tabler/icons-react";
import {
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  type AdminNavigationGroup,
  type AdminWorkspaceTab,
  isAdminRouteActive,
} from "@/lib/admin-navigation";
import { ADMIN_ROUTES } from "@/lib/admin-routes";

type StudioSidebarProps = {
  pathname: string;
  navigation: readonly AdminNavigationGroup[];
  workspaceTab: AdminWorkspaceTab;
};

export function StudioSidebar({
  pathname,
  navigation,
  workspaceTab,
}: StudioSidebarProps) {
  const canonicalGroupHref = (group: AdminNavigationGroup) =>
    group.label === "Overview"
      ? ADMIN_ROUTES.overview
      : group.label === "Studio"
        ? ADMIN_ROUTES.studio.works
        : group.label === "Staff"
          ? ADMIN_ROUTES.staff.team
          : group.label === "System"
            ? ADMIN_ROUTES.system.overview
            : group.href;

  const studioLabels: Record<string, string> = {
    [ADMIN_ROUTES.overview]: "Overview",
    [ADMIN_ROUTES.studio.works]: "Works",
    [ADMIN_ROUTES.studio.crm]: "CRM overview",
    [ADMIN_ROUTES.studio.content]: "Content studio",
    [ADMIN_ROUTES.studio.clients]: "Clients",
    [ADMIN_ROUTES.studio.appointments]: "Appointments",
    [ADMIN_ROUTES.studio.blogs]: "Journal",
    [ADMIN_ROUTES.staff.team]: "Team access",
    [ADMIN_ROUTES.system.settings]: "Settings",
    [ADMIN_ROUTES.system.auditLogs]: "Audit log",
    [ADMIN_ROUTES.system.emailEvents]: "Email delivery",
    [ADMIN_ROUTES.system.automations]: "Automation health",
    [ADMIN_ROUTES.system.notifications]: "Notification history",
    [ADMIN_ROUTES.system.notificationReports]: "Weekly reports",
    [ADMIN_ROUTES.system.systemHealth]: "System health",
  };

  const systemRoutes = Object.values(ADMIN_ROUTES.system).filter(
    (href) => href !== ADMIN_ROUTES.system.overview && href !== ADMIN_ROUTES.system.settings,
  );

  const studioLinks = navigation
    .flatMap((group) =>
      group.label === "System"
        ? [{ label: "System", href: ADMIN_ROUTES.system.overview, icon: group.icon }]
        : [
            { label: group.label, href: canonicalGroupHref(group), icon: group.icon },
            ...group.links,
          ],
    )
    .filter((link, index, links) => links.findIndex((item) => item.href === link.href) === index)
    .map((link) => ({ ...link, label: studioLabels[link.href] || link.label }));

  const storeLinks = navigation
    .flatMap((group) => [
      {
        label: group.label === "Store" ? "Overview" : group.label === "Payments & invoices" ? "Orders" : "Reports",
        href: group.label === "Store" ? ADMIN_ROUTES.store.overview : group.label === "Payments & invoices" ? ADMIN_ROUTES.operations.orders : ADMIN_ROUTES.operations.reports,
        icon: group.icon,
      },
      ...group.links,
    ])
    .filter((link, index, links) => links.findIndex((item) => item.href === link.href) === index)
    .map((link) => ({
      ...link,
      label: link.href === "/store" ? "Overview" : link.href === "/reports" ? "Reports" : link.label,
    }));

  return (
    <aside className="fixed bottom-0 left-0 top-[56px] z-40 hidden w-[280px] flex-col border-r border-border bg-background text-foreground lg:flex">
      <div className="border-b border-border px-3 py-3">
        <div
          role="tablist"
          aria-label="CMS workspace"
          className="grid grid-cols-2 gap-1"
        >
          <Link
            href="/"
            role="tab"
            aria-selected={workspaceTab === "studio"}
            className={`flex h-8 items-center justify-center rounded-lg text-xs font-medium transition-colors ${workspaceTab === "studio" ? "bg-muted hover:bg-accent text-foreground " : "text-muted-foreground hover:text-foreground"}`}
          >
            Studio
          </Link>
          <Link
            href="/store"
            role="tab"
            aria-selected={workspaceTab === "store"}
            className={`flex h-8 items-center justify-center rounded-lg text-xs font-medium transition-colors ${workspaceTab === "store" ? "bg-muted hover:bg-accent text-foreground " : "text-muted-foreground hover:text-foreground"}`}
          >
            Store
          </Link>
        </div>
      </div>
      <SidebarContent className="px-3 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu aria-label="CMS navigation" className="gap-1">
              {(workspaceTab === "store" ? storeLinks : studioLinks).map(({ label, href, icon: LinkIcon }) => {
                    const active = href === ADMIN_ROUTES.system.overview
                      ? pathname === href || systemRoutes.some((route) => isAdminRouteActive(pathname, route))
                      : href === ADMIN_ROUTES.store.overview
                        ? pathname === href
                        : isAdminRouteActive(pathname, href);
                    return (
                      <SidebarMenuItem key={href}>
                        <SidebarMenuButton
                          render={<Link href={href} />}
                          isActive={active}
                          aria-current={active ? "page" : undefined}
                          className={`h-9 rounded-lg px-3 text-[13px] transition-colors ${active ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"}`}
                        >
                          <LinkIcon className="size-4" stroke={1.7} />
                          <span>{label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="mt-auto border-t border-border p-3">
        <SidebarMenu className="gap-1">
          <SidebarMenuItem>
            <SidebarMenuButton
              render={
                <a href="mailto:hello@zerocraft.in?subject=CMS%20support" />
              }
              className="h-9 rounded-lg px-3 text-[13px] text-muted-foreground hover:bg-muted/70 hover:text-foreground"
            >
              <IconHelpCircle className="size-4" />
              <span>Help &amp; support</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<Link href="/settings" />}
              isActive={isAdminRouteActive(pathname, "/settings")}
              aria-current={
                isAdminRouteActive(pathname, "/settings") ? "page" : undefined
              }
              className={`h-9 rounded-lg px-3 text-[13px] ${isAdminRouteActive(pathname, "/settings") ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"}`}
            >
              <IconSettings className="size-4" />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </aside>
  );
}
