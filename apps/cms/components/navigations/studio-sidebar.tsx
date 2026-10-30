"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  IconHelpCircle,
  IconPlus,
  IconSearch,
  IconSettings,
  IconShoppingBag,
  IconBriefcase,
  IconHome,
} from "@tabler/icons-react";
import {
  Sidebar as SidebarPrimitive,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  type AdminNavigationGroup,
  type AdminNavigationLink,
  isAdminRouteActive,
} from "@/lib/admin-navigation";
import { ADMIN_ROUTES, type AdminRoute } from "@/lib/admin-routes";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "../ui/hover-card";
import { cn } from "@/lib/utils";
import { WorkspaceSwitcher } from "@/components/navigations/workspace-switcher";
import { NotificationFeed } from "@/components/navigations/notification-feed";
import type { StudioNotification } from "@/lib/supabase-client";

type StudioSidebarProps = {
  pathname: string;
  navigation: readonly AdminNavigationGroup[];
  user: { name: string; email: string };
  unreadAlerts: number;
  isSigningOut: boolean;
  onSignOut: () => void;
  collapsed: boolean;
  onOpenSearch: () => void;
  collapsedTriggerSuppressed: boolean;
  onCollapsedTriggerReveal: () => void;
  notices: StudioNotification[];
  noticesOpen: boolean;
  onNoticesOpenChange: (open: boolean) => void;
  onReadNotice: (item: StudioNotification) => void;
  onMarkAllRead: () => void;
  onRefreshNotices: () => void;
  onClearReadNotices: () => void;
  noticesLoading: boolean;
};

type SidebarPresentationGroup = {
  label: string;
  href: AdminNavigationLink["href"];
  icon: AdminNavigationLink["icon"];
  links: readonly AdminNavigationLink[];
};

export function StudioSidebar({
  pathname,
  navigation,
  user,
  unreadAlerts,
  isSigningOut,
  onSignOut,
  collapsed,
  onOpenSearch,
  collapsedTriggerSuppressed,
  onCollapsedTriggerReveal,
  notices,
  noticesOpen,
  onNoticesOpenChange,
  onReadNotice,
  onMarkAllRead,
  onRefreshNotices,
  onClearReadNotices,
  noticesLoading,
}: StudioSidebarProps) {
  const [channelsOpen, setChannelsOpen] = useState(true);
  const [appsOpen, setAppsOpen] = useState(true);

  const sourceLinks = useMemo(
    () =>
      new Map(
        navigation
          .flatMap((group) => group.links)
          .map((link) => [link.href, link]),
      ),
    [navigation],
  );
  const presentationNavigation = useMemo<
    readonly SidebarPresentationGroup[]
  >(() => {
    const link = (href: AdminNavigationLink["href"]) => sourceLinks.get(href);
    const addWorkspace = (
      label: string,
      icon: AdminNavigationLink["icon"],
      hrefs: readonly AdminNavigationLink["href"][],
      firstLinkLabel?: string,
    ): SidebarPresentationGroup | null => {
      const links = hrefs
        .map(link)
        .filter(Boolean)
        .filter(
          (item, index, all) =>
            all.findIndex((candidate) => candidate?.href === item?.href) ===
            index,
        )
        .filter(Boolean) as AdminNavigationLink[];
      if (!links.length) return null;

      const presentationLinks = firstLinkLabel
        ? links.map((item, index) =>
            index === 0 ? { ...item, label: firstLinkLabel, icon } : item,
          )
        : links;

      return {
        label,
        href: presentationLinks[0].href,
        icon,
        links: presentationLinks,
      };
    };

    const studio = addWorkspace("Studio", IconBriefcase, [
      ADMIN_ROUTES.studio.leads,
      ADMIN_ROUTES.studio.clients,
      ADMIN_ROUTES.studio.projects,
      ADMIN_ROUTES.studio.works,
      ADMIN_ROUTES.studio.crm,
      ADMIN_ROUTES.studio.content,
      ADMIN_ROUTES.studio.appointments,
    ]);
    const store = addWorkspace("Store", IconShoppingBag, [
      ADMIN_ROUTES.store.drafts,
      ADMIN_ROUTES.operations.orders,
      ADMIN_ROUTES.store.products,
      ADMIN_ROUTES.store.customers,
      ADMIN_ROUTES.store.growth,
      ADMIN_ROUTES.store.discounts,
      ADMIN_ROUTES.store.content,
      ADMIN_ROUTES.store.markets,
      ADMIN_ROUTES.store.analytics,
    ]);

    const isStore =
      pathname === ADMIN_ROUTES.store.overview ||
      pathname.startsWith(`${ADMIN_ROUTES.store.overview}/`);
    const homeHref = isStore
      ? ADMIN_ROUTES.store.overview
      : ADMIN_ROUTES.studio.overview;
    const homeSourceLink = sourceLinks.get(homeHref);
    const homeLink: AdminNavigationLink = homeSourceLink
      ? { ...homeSourceLink, label: "Home", icon: IconHome }
      : { label: "Home", href: homeHref, icon: IconHome };
    const home: SidebarPresentationGroup = {
      label: "Home",
      href: homeHref,
      icon: IconHome,
      links: [homeLink],
    };
    return [home, isStore ? store : studio].filter(
      Boolean,
    ) as SidebarPresentationGroup[];
  }, [pathname, sourceLinks]);

  const itemClass = (active: boolean, child = false) =>
    `flex h-8 min-h-8 items-center rounded-xl p-2 text-[13px] transition-colors duration-150 ${child ? "grid grid-cols-[16px_minmax(0,1fr)] gap-2 px-2.5" : ""} ${active ? "!bg-[#303033] font-semibold !text-[#f1f1f1]" : "!text-[#b4b4b8] hover:!bg-[#242426] hover:!text-[#f1f1f1]"}`;

  return (
    <SidebarPrimitive
      collapsible="icon"
      variant="sidebar"
      className="hidden text-foreground lg:block bg-transparent"
    >
      <SidebarHeader className="h-14 shrink-0 p-0">
        <div
          className={`relative flex h-14 shrink-0 items-center ${
            collapsed ? "justify-center px-0" : "gap-2.5 px-3"
          }`}
        >
          <div
            className={collapsed ? "group/logo relative size-8" : "contents"}
            onPointerMove={() => {
              if (collapsed) onCollapsedTriggerReveal();
            }}
          >
            <Link
              href="/"
              aria-label="ZeroCraft home"
              className={`flex min-w-0 items-center ${
                collapsed
                  ? cn(
                      "size-8 justify-center",
                      collapsedTriggerSuppressed
                        ? "opacity-100"
                        : "transition-opacity duration-100 group-hover/logo:opacity-0 group-focus-within/logo:opacity-0",
                    )
                  : "gap-2.5 px-1.5 py-1"
              }`}
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-[#111214] ring-1 ring-white/5">
                <Image src="/icon.svg" alt="" width={20} height={20} priority />
              </span>
            </Link>

            <SidebarTrigger
              className={cn(
                "z-10 grid size-8 shrink-0 place-items-center rounded-xl border border-[#454548] bg-[#303033] text-[#b4b4b8] transition-[opacity,background-color,color] duration-100 active:!translate-y-0 hover:bg-[#3a3a3d] hover:text-[#f1f1f1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                collapsed
                  ? collapsedTriggerSuppressed
                    ? "pointer-events-none absolute inset-0 opacity-0"
                    : "pointer-events-none absolute inset-0 opacity-0 group-hover/logo:pointer-events-auto group-hover/logo:opacity-100 group-focus-within/logo:pointer-events-auto group-focus-within/logo:opacity-100"
                  : "ml-auto opacity-100",
              )}
            />
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent
        className={`${collapsed ? "px-0" : "px-3"} py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}
      >
        <button
          type="button"
          onClick={onOpenSearch}
          aria-label="Search"
          className={`mb-3 size-8 items-center rounded-xl border border-[#454548] bg-[#303033] text-left text-[13px] text-[#b4b4b8] transition-colors hover:bg-[#3a3a3d] hover:text-[#f1f1f1] ${collapsed ? "mx-auto flex justify-center" : "grid w-full grid-cols-[16px_minmax(0,1fr)_auto] gap-2 px-2.5"}`}
        >
          <IconSearch className="size-4 shrink-0" stroke={1.8} />
          {!collapsed && (
            <>
              <span className="flex-1">Search</span>
              <kbd className="rounded bg-[#1f1f21] px-1.5 py-0.5 text-[10px] text-[#b4b4b8]">
                Ctrl K
              </kbd>
            </>
          )}
        </button>
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu aria-label="CMS navigation" className="gap-0.5">
              {presentationNavigation.map((group) => {
                const expanded = true;
                return (
                  <div key={group.label} className="contents">
                    {expanded && group.links.length > 0 && (
                      <div className="overflow-hidden">
                        <div className="py-0.5">
                          {(group.label === "Store"
                            ? [
                                {
                                  parent: sourceLinks.get(
                                    ADMIN_ROUTES.operations.orders,
                                  ),
                                  children: [
                                    sourceLinks.get(ADMIN_ROUTES.store.drafts),
                                  ],
                                },
                                {
                                  parent: sourceLinks.get(
                                    ADMIN_ROUTES.store.products,
                                  ),
                                  children: [
                                    sourceLinks.get(
                                      ADMIN_ROUTES.store.categories,
                                    ),
                                    sourceLinks.get(
                                      ADMIN_ROUTES.store.inventory,
                                    ),
                                    sourceLinks.get(
                                      ADMIN_ROUTES.operations.purchaseOrders,
                                    ),
                                    sourceLinks.get(
                                      ADMIN_ROUTES.operations.transfers,
                                    ),
                                    sourceLinks.get(
                                      ADMIN_ROUTES.operations.giftCards,
                                    ),
                                  ],
                                },
                                ...group.links
                                  .filter(
                                    (link) =>
                                      !(
                                        [
                                          ADMIN_ROUTES.store.drafts,
                                          ADMIN_ROUTES.operations.orders,
                                          ADMIN_ROUTES.store.products,
                                          ADMIN_ROUTES.store.categories,
                                          ADMIN_ROUTES.store.inventory,
                                          ADMIN_ROUTES.operations
                                            .purchaseOrders,
                                          ADMIN_ROUTES.operations.transfers,
                                          ADMIN_ROUTES.operations.giftCards,
                                        ] as AdminRoute[]
                                      ).includes(link.href),
                                  )
                                  .map((parent) => ({
                                    parent:
                                      parent.href === ADMIN_ROUTES.store.growth
                                        ? { ...parent, label: "Growth" }
                                        : parent,
                                    children: [] as AdminNavigationLink[],
                                  })),
                              ]
                            : group.links.map((parent) => ({
                                parent,
                                children: [] as AdminNavigationLink[],
                              }))
                          ).map(({ parent: link, children }) => {
                            if (!link) return null;
                            const childActive = children.some(
                              (child) =>
                                child != null &&
                                isAdminRouteActive(pathname, child.href),
                            );
                            // Shopify keeps the parent as context when a child
                            // is selected: only the exact parent route gets the
                            // parent's selected background.
                            const active =
                              link.href === group.href
                                ? pathname === link.href
                                : children.length > 0
                                  ? pathname === link.href
                                  : isAdminRouteActive(pathname, link.href);
                            const expanded = active || childActive;
                            const ChildIcon = link.icon;
                            return (
                              <div
                                key={`${group.label}-${link.label}`}
                                className={
                                  collapsed
                                    ? "flex w-full justify-center"
                                    : "w-full"
                                }
                              >
                                <SidebarMenuItem>
                                  {collapsed && children.length > 0 ? (
                                    <HoverCard>
                                      <HoverCardTrigger
                                        render={
                                          <div className="flex justify-center" />
                                        }
                                      >
                                        <SidebarMenuButton
                                          render={<Link href={link.href} />}
                                          isActive={active}
                                          aria-current={
                                            active ? "page" : undefined
                                          }
                                          className={`${itemClass(active, true)} !mx-0 !size-8 !flex-none !grid-cols-1 !justify-center !gap-0 !p-0`}
                                        >
                                          <ChildIcon
                                            className="size-4 shrink-0 opacity-80"
                                            stroke={1.7}
                                          />
                                        </SidebarMenuButton>
                                      </HoverCardTrigger>
                                      <HoverCardContent
                                        side="right"
                                        align="start"
                                        sideOffset={10}
                                        className="w-max p-1 space-y-1 border-none!"
                                      >
                                        <div className="text-[13px] rounded-lg font-semibold h-6 flex items-center px-2 bg-[#303033] text-[#f1f1f1]">
                                          {link.label}
                                        </div>
                                        <div className="space-y-1">
                                          {children
                                            .filter(Boolean)
                                            .map((child) => (
                                              <Link
                                                key={child!.href}
                                                href={child!.href}
                                                className={cn(
                                                  "block rounded-lg text-[13px] h-6 flex items-center px-2 transition-colors",
                                                  pathname === child!.href
                                                    ? "bg-[#303033] font-semibold text-[#f1f1f1]"
                                                    : "text-[#b4b4b8] hover:bg-[#303033] hover:text-[#f1f1f1]",
                                                )}
                                              >
                                                {child!.label}
                                              </Link>
                                            ))}
                                        </div>
                                      </HoverCardContent>
                                    </HoverCard>
                                  ) : (
                                    <SidebarMenuButton
                                      render={<Link href={link.href} />}
                                      isActive={active}
                                      aria-current={active ? "page" : undefined}
                                      className={`${itemClass(active, true)} ${childActive ? "!font-semibold !text-[#f1f1f1]" : ""} ${collapsed ? "!mx-0 !size-8 !flex-none !grid-cols-1 !justify-center !gap-0 !p-0" : "w-full"}`}
                                    >
                                      <ChildIcon
                                        className="size-4 shrink-0 opacity-80"
                                        stroke={1.7}
                                      />
                                      {!collapsed && (
                                        <span className="truncate">
                                          {link.label}
                                        </span>
                                      )}
                                    </SidebarMenuButton>
                                  )}
                                  {!collapsed &&
                                    expanded &&
                                    children.length > 0 && (
                                      <div className="ml-7 space-y-0.5 py-0.5">
                                        {children
                                          .filter(Boolean)
                                          .map((child) => {
                                            const childActive =
                                              pathname === child!.href;
                                            return (
                                              <Link
                                                key={child!.href}
                                                href={child!.href}
                                                aria-current={
                                                  childActive
                                                    ? "page"
                                                    : undefined
                                                }
                                                className={cn(
                                                  "-ml-7 block w-[calc(100%+1.75rem)] rounded-xl flex items-center h-8 pl-8 pr-2.5 text-[13px] transition-colors duration-150",
                                                  childActive
                                                    ? "bg-[#303033] font-semibold text-[#f1f1f1]"
                                                    : "text-[#a9a9ad] hover:bg-[#242426] hover:text-[#f1f1f1]",
                                                )}
                                              >
                                                {child!.label}
                                              </Link>
                                            );
                                          })}
                                      </div>
                                    )}
                                </SidebarMenuItem>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <div className="mt-4 border-t border-[#2d2d30] pt-3">
          <button
            type="button"
            onClick={() => setChannelsOpen((value) => !value)}
            aria-expanded={channelsOpen}
            className={`flex h-8 min-h-8 w-full items-center rounded-xl p-2 text-left text-[11px] font-semibold text-muted-foreground hover:bg-muted/70 hover:text-foreground ${collapsed ? "mx-auto size-8! flex-none justify-center text-[9px]" : ""}`}
          >
            {collapsed ? (
              <IconShoppingBag className="size-4" />
            ) : (
              "Sales channels"
            )}
            <span className="sr-only">
              {channelsOpen ? "Collapse" : "Expand"} Sales channels
            </span>
          </button>
          {channelsOpen && !collapsed && (
            <div className="overflow-hidden">
              <Link
                href="/channels"
                className={`${itemClass(isAdminRouteActive(pathname, "/channels"))} whitespace-nowrap px-2.5`}
              >
                Online Store
              </Link>
              <Link
                href="/integrations"
                className={`${itemClass(isAdminRouteActive(pathname, "/integrations"))} whitespace-nowrap px-2.5`}
              >
                Agentic
              </Link>
            </div>
          )}
          <div className="mt-0.5 flex items-center">
            <button
              type="button"
              onClick={() => setAppsOpen((value) => !value)}
              aria-expanded={appsOpen}
              className={`flex h-8 min-h-8 min-w-0 flex-1 items-center rounded-xl p-2 text-[13px] text-muted-foreground hover:bg-muted/70 hover:text-foreground ${collapsed ? "mx-auto size-8! flex-none justify-center" : ""}`}
            >
              {collapsed ? <IconPlus className="size-4" /> : <span>Apps</span>}
              <span className="sr-only">
                {appsOpen ? "Collapse" : "Expand"} Apps
              </span>
            </button>
            {!collapsed && (
              <button
                type="button"
                aria-label="Add app"
                className="grid size-8 place-items-center rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <IconPlus className="size-3.5" />
              </button>
            )}
          </div>
          {appsOpen && !collapsed && (
            <Link
              href="/integrations"
              className={`${itemClass(isAdminRouteActive(pathname, "/integrations"))} whitespace-nowrap px-2.5`}
            >
              Add
            </Link>
          )}
        </div>
      </SidebarContent>
      <SidebarFooter className={`mt-auto ${collapsed ? "p-2" : "p-3"}`}>
        <SidebarMenu className="gap-0.5">
          <SidebarMenuItem>
            <SidebarMenuButton
              render={
                <a href="mailto:hello@zerocraft.in?subject=CMS%20support" />
              }
              className={`h-8 rounded-xl px-2.5 text-[13px] text-muted-foreground hover:bg-muted/70 hover:text-foreground ${collapsed ? "mx-auto size-8! flex-none justify-center p-2" : ""}`}
            >
              <IconHelpCircle className="size-4" />
              {!collapsed && <span>Help &amp; support</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<Link href="/settings" />}
              isActive={isAdminRouteActive(pathname, "/settings")}
              className={`h-8 rounded-xl px-2.5 text-[13px] ${collapsed ? "mx-auto size-8! flex-none justify-center p-2" : ""} ${isAdminRouteActive(pathname, "/settings") ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"}`}
            >
              <IconSettings className="size-4" />
              {!collapsed && <span>Settings</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <div
          className={`flex items-center ${collapsed ? "justify-center flex-col-reverse" : "gap-2 flex-row"}`}
        >
          <div className={collapsed ? "" : "min-w-[150px] flex-1"}>
            <WorkspaceSwitcher
              pathname={pathname}
              collapsed={collapsed}
              user={user}
              isSigningOut={isSigningOut}
              onSignOut={onSignOut}
            />
          </div>
          <NotificationFeed
            notices={notices}
            unread={unreadAlerts}
            open={noticesOpen}
            onOpenChange={onNoticesOpenChange}
            onRead={onReadNotice}
            onMarkAllRead={onMarkAllRead}
            onRefresh={onRefreshNotices}
            onClearRead={onClearReadNotices}
            loading={noticesLoading}
            collapsed={collapsed}
          />
        </div>
      </SidebarFooter>
    </SidebarPrimitive>
  );
}
