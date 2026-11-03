"use client";

import { useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  IconHelpCircle,
  IconSearch,
  IconSettings,
  IconShoppingBag,
  IconHome,
  IconFileText,
  IconChartBar,
  IconApps,
  IconBuildingStore,
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
} from "@zerocraft/components/ui/sidebar";
import { Kbd, KbdGroup } from "@zerocraft/components/ui/kbd";
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
} from "@zerocraft/components/ui/hover-card";
import { cn } from "@/lib/utils";
import { NotificationFeed } from "@/components/navigations/notification-feed";
import type { CommerceNotification } from "@/lib/supabase-client";
import { AccountMenu } from "@/components/navigations/workspace-switcher";
import { scopedPath, unscopedPath } from "@/lib/platform/scope";

type CommerceSidebarProps = {
  pathname: string;
  navigation: readonly AdminNavigationGroup[];
  user: { name: string; email: string };
  isSigningOut: boolean;
  onSignOut: () => void;
  unreadAlerts: number;
  collapsed: boolean;
  onOpenSearch: () => void;
  collapsedTriggerSuppressed: boolean;
  onCollapsedTriggerReveal: () => void;
  notices: CommerceNotification[];
  noticesOpen: boolean;
  onNoticesOpenChange: (open: boolean) => void;
  onReadNotice: (item: CommerceNotification) => void;
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
  children?: Readonly<Record<string, readonly AdminNavigationLink[]>>;
};

export function getSidebarPresentationNavigation(
  navigation: readonly AdminNavigationGroup[],
  pathname = "/",
): readonly SidebarPresentationGroup[] {
  const sourceLinks = new Map(
    navigation.flatMap((group) => group.links).map((link) => [link.href, link]),
  );
  const makeGroup = (
    label: string,
    icon: AdminNavigationLink["icon"],
    hrefs: readonly AdminNavigationLink["href"][],
  ): SidebarPresentationGroup | null => {
    const links = hrefs.map((href) => sourceLinks.get(href)).filter(Boolean) as AdminNavigationLink[];
    if (!links.length) return null;
    return { label, href: links[0].href, icon, links };
  };
  const home = makeGroup("Home", IconHome, [ADMIN_ROUTES.store.overview]);
  const storeBase = makeGroup("Store", IconShoppingBag, [
    ADMIN_ROUTES.operations.orders,
    ADMIN_ROUTES.store.products,
    ADMIN_ROUTES.store.customers,
  ]);
  const children = (...hrefs: AdminNavigationLink["href"][]) => hrefs
    .map((href) => sourceLinks.get(href))
    .filter(Boolean) as AdminNavigationLink[];
  const store = storeBase && {
    ...storeBase,
    children: {
      [ADMIN_ROUTES.operations.orders]: children(
        ADMIN_ROUTES.operations.orderDrafts,
        ADMIN_ROUTES.operations.abandonedCheckouts,
        ADMIN_ROUTES.operations.purchaseOrders,
      ),
      [ADMIN_ROUTES.store.products]: children(
        ADMIN_ROUTES.store.categories,
        ADMIN_ROUTES.store.inventory,
        ADMIN_ROUTES.store.recycleBin,
      ),
    },
  };
  const content = makeGroup("Content", IconFileText, [
    ADMIN_ROUTES.store.content,
    ADMIN_ROUTES.store.media,
  ]);
  const contentWithChildren = content && {
    ...content,
    children: {
      [ADMIN_ROUTES.store.content]: children(
        ADMIN_ROUTES.store.metaobjects,
        ADMIN_ROUTES.store.files,
        ADMIN_ROUTES.store.menus,
        ADMIN_ROUTES.store.articles,
      ),
      [ADMIN_ROUTES.store.media]: children(ADMIN_ROUTES.store.mediaLibrary),
    },
  };
  const insights = makeGroup("Insights", IconChartBar, [
    ADMIN_ROUTES.store.analytics,
    ADMIN_ROUTES.operations.liveView,
  ]);
  const salesChannels = makeGroup("Sales channels", IconBuildingStore, [
    ADMIN_ROUTES.store.onlineStore,
    ADMIN_ROUTES.store.channels,
  ]);
  const salesChannelsWithChildren = salesChannels && {
    ...salesChannels,
    children: {
      [ADMIN_ROUTES.store.onlineStore]: children(
        ADMIN_ROUTES.store.onlineStorePages,
        ADMIN_ROUTES.store.onlineStorePreferences,
      ),
      [ADMIN_ROUTES.store.channels]: children(
        ADMIN_ROUTES.store.pointOfSaleDevices,
        ADMIN_ROUTES.store.pointOfSaleRegisterSessions,
        ADMIN_ROUTES.store.pointOfSaleSettings,
      ),
    },
  };
  return [home, store, contentWithChildren, insights, salesChannelsWithChildren].filter(Boolean) as SidebarPresentationGroup[];
}

export function CommerceSidebar({
  pathname,
  navigation,
  user,
  isSigningOut,
  onSignOut,
  unreadAlerts,
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
}: CommerceSidebarProps) {
  const [channelsOpen, setChannelsOpen] = useState(true);

  const sourceLinks = useMemo(
    () => new Map(navigation.flatMap((group) => group.links).map((link) => [link.href, link])),
    [navigation],
  );
  const allPresentationNavigation = useMemo(() => getSidebarPresentationNavigation(navigation), [navigation]);
  const presentationNavigation = allPresentationNavigation.filter(
    (group) => group.label !== "Sales channels",
  );

  const itemClass = (active: boolean, child = false) =>
    `flex h-8 min-h-8 items-center rounded-lg p-2 text-[13px] transition-colors duration-150 ${child ? "grid grid-cols-[16px_minmax(0,1fr)] gap-2 px-2.5" : ""} ${active ? "!bg-sidebar-accent font-semibold !text-sidebar-accent-foreground" : "!text-sidebar-foreground/70 hover:!bg-sidebar-accent/70 hover:!text-sidebar-accent-foreground"}`;
  const activeFor = (href: string) => isAdminRouteActive(unscopedPath(pathname), href);
  const salesChannelsNavigation = allPresentationNavigation.find(
    (group) => group.label === "Sales channels",
  );

  return (
    <SidebarPrimitive
      collapsible="icon"
      variant="sidebar"
      style={
        {
          "--sidebar-foreground": "oklch(0.985 0 0)",
          "--sidebar-accent": "oklch(0.235 0 0)",
          "--sidebar-accent-foreground": "oklch(0.985 0 0)",
          "--sidebar-border": "oklch(1 0 0 / 12%)",
          "--sidebar-ring": "oklch(0.7 0 0)",
        } as CSSProperties
      }
      className="hidden bg-primary! text-sidebar-foreground lg:block"
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
              href={scopedPath("/", pathname)}
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
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-foreground ring-1 ring-sidebar-border">
                <Image src="/icon.svg" alt="" width={20} height={20} priority />
              </span>
            </Link>

            <SidebarTrigger
              className={cn(
                "z-10 grid size-8 shrink-0 place-items-center rounded-lg border border-sidebar-border bg-sidebar-accent text-sidebar-foreground transition-[opacity,background-color,color] duration-100 active:!translate-y-0 hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
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
        className={`${collapsed ? "px-0 [&_[data-slot=sidebar-menu-button]]:!mx-auto [&_[data-slot=sidebar-menu-button]]:!w-8 [&_[data-slot=sidebar-menu-button]]:!justify-center [&_[data-slot=sidebar-menu-button]]:!place-items-center [&_[data-slot=sidebar-menu-button]]:!px-0" : "px-3"} py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}
      >
        <button
          type="button"
          onClick={onOpenSearch}
          aria-label="Search"
          className={`mb-3 size-8 items-center rounded-lg border border-sidebar-border bg-sidebar-accent text-left text-[13px] text-sidebar-foreground transition-colors hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground ${collapsed ? "mx-auto flex justify-center" : "grid w-full grid-cols-[16px_minmax(0,1fr)_auto] gap-2 px-2.5"}`}
        >
          <IconSearch className="size-4 shrink-0" stroke={1.8} />
          {!collapsed && (
            <>
              <span className="flex-1">Search</span>
              <KbdGroup aria-label="Keyboard shortcut">
                <Kbd className="border-sidebar-border bg-sidebar-accent text-sidebar-foreground/80">
                  Ctrl
                </Kbd>
                <Kbd className="border-sidebar-border bg-sidebar-accent text-sidebar-foreground/80">
                  K
                </Kbd>
              </KbdGroup>
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
                            ? group.links.map((parent) => ({
                                parent,
                                children: group.children?.[parent.href] ?? [],
                              }))
                              : group.label === "Content"
                              ? group.links.map((parent) => ({
                                  parent,
                                  children: group.children?.[parent.href] ?? [],
                                }))
                              : group.label === "Insights"
                                ? [{ parent: sourceLinks.get(ADMIN_ROUTES.store.analytics) ?? group.links[0], children: group.links.filter((link) => link.href !== ADMIN_ROUTES.store.analytics) }]
                                : group.links.map((parent) => ({
                                parent,
                                children: [] as AdminNavigationLink[],
                              }))
                          ).map(({ parent: link, children }) => {
                            if (!link) return null;
                            const childActive = children.some(
                              (child) =>
                                child != null &&
                                activeFor(child.href),
                            );
                            // Shopify keeps the parent as context when a child
                            // is selected: only the exact parent route gets the
                            // parent's selected background.
                            const active =
                              link.href === group.href
                                ? unscopedPath(pathname) === link.href
                                : children.length > 0
                                  ? unscopedPath(pathname) === link.href
                                  : activeFor(link.href);
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
                                          render={<Link href={scopedPath(link.href, pathname)} />}
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
                                        <div className="flex h-6 items-center rounded-md bg-sidebar-accent px-2 text-[13px] font-semibold text-sidebar-accent-foreground">
                                          {link.label}
                                        </div>
                                        <div className="space-y-1">
                                          {children
                                            .filter(Boolean)
                                            .map((child) => (
                                              <Link
                                                key={child!.href}
                                                href={scopedPath(child!.href, pathname)}
                                                className={cn(
                                                  "block rounded-lg text-[13px] h-6 flex items-center px-2 transition-colors",
                                                  unscopedPath(pathname) === child!.href
                                                    ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                                                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
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
                                      render={<Link href={scopedPath(link.href, pathname)} />}
                                      isActive={active}
                                      aria-current={active ? "page" : undefined}
                                      className={`${itemClass(active, true)} ${childActive ? "!font-semibold !text-sidebar-accent-foreground" : ""} ${collapsed ? "!mx-0 !size-8 !flex-none !grid-cols-1 !justify-center !gap-0 !p-0" : "w-full"}`}
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
                                            const childActive = unscopedPath(pathname) === child!.href;
                                            return (
                                              <Link
                                                key={child!.href}
                                                href={scopedPath(child!.href, pathname)}
                                                aria-current={
                                                  childActive
                                                    ? "page"
                                                    : undefined
                                                }
                                                className={cn(
                                                  "-ml-7 flex h-8 w-[calc(100%+1.75rem)] items-center rounded-lg pl-8 pr-2.5 text-[13px] transition-colors duration-150",
                                                  childActive
                                                    ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                                                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
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
          <div className="mt-4 border-t border-sidebar-border pt-3">
          <button
            type="button"
            onClick={() => setChannelsOpen((value) => !value)}
            aria-expanded={channelsOpen}
            className={`flex h-8 min-h-8 w-full items-center rounded-xl p-2 text-left text-[11px] font-semibold text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${collapsed ? "mx-auto size-8! flex-none !justify-center !p-0 text-[9px]" : ""}`}
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
          {channelsOpen && salesChannelsNavigation && (
            <SidebarMenu aria-label="Sales channels" className="gap-0.5">
              {salesChannelsNavigation.links.map((link) => {
                const children = salesChannelsNavigation.children?.[link.href] ?? [];
                const parentActive = unscopedPath(pathname) === link.href;
                const childActive = children.some((child) => activeFor(child.href));
                const expanded = parentActive || childActive;
                const ChannelIcon = link.icon;

                return (
                  <SidebarMenuItem key={link.href}>
                    {collapsed && children.length > 0 ? (
                      <HoverCard>
                        <HoverCardTrigger render={<div className="flex justify-center" />}>
                          <SidebarMenuButton
                            render={<Link href={scopedPath(link.href, pathname)} />}
                            isActive={parentActive}
                            aria-current={parentActive ? "page" : undefined}
                            aria-label={link.label}
                            className={`${itemClass(parentActive, true)} !mx-0 !size-8 !flex-none !grid-cols-1 !justify-center !gap-0 !p-0`}
                          >
                            <ChannelIcon className="size-4 shrink-0 opacity-80" stroke={1.7} />
                          </SidebarMenuButton>
                        </HoverCardTrigger>
                        <HoverCardContent side="right" align="start" sideOffset={10} className="w-max space-y-1 border-none! p-1">
                          <div className="flex h-6 items-center rounded-md bg-sidebar-accent px-2 text-[13px] font-semibold text-sidebar-accent-foreground">{link.label}</div>
                          {children.map((child) => (
                            <Link
                              key={child.href}
                              href={scopedPath(child.href, pathname)}
                              aria-current={unscopedPath(pathname) === child.href ? "page" : undefined}
                              className={cn(
                                "flex h-7 items-center rounded-lg px-2 text-[13px] transition-colors",
                                unscopedPath(pathname) === child.href
                                  ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                              )}
                            >
                              {child.label}
                            </Link>
                          ))}
                        </HoverCardContent>
                      </HoverCard>
                    ) : (
                      <>
                        <SidebarMenuButton
                          render={<Link href={scopedPath(link.href, pathname)} />}
                          isActive={parentActive}
                          aria-current={parentActive ? "page" : undefined}
                          className={`${itemClass(parentActive, true)} ${childActive ? "!font-semibold !text-sidebar-accent-foreground" : ""} ${collapsed ? "!mx-0 !size-8 !flex-none !grid-cols-1 !justify-center !gap-0 !p-0" : "w-full"}`}
                        >
                          <ChannelIcon className="size-4 shrink-0 opacity-80" stroke={1.7} />
                          {!collapsed && <span className="truncate">{link.label}</span>}
                        </SidebarMenuButton>
                        {!collapsed && expanded && children.length > 0 && (
                          <div className="ml-7 space-y-0.5 py-0.5">
                            {children.map((child) => {
                              const active = unscopedPath(pathname) === child.href;
                              return (
                                <Link
                                  key={child.href}
                                  href={scopedPath(child.href, pathname)}
                                  aria-current={active ? "page" : undefined}
                                  className={cn(
                                    "-ml-7 flex h-8 w-[calc(100%+1.75rem)] items-center rounded-lg pl-8 pr-2.5 text-[13px] transition-colors duration-150",
                                    active
                                      ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                                  )}
                                >
                                  {child.label}
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          )}
          <Link
            href={scopedPath(ADMIN_ROUTES.system.integrations, pathname)}
            aria-current={activeFor(ADMIN_ROUTES.system.integrations) ? "page" : undefined}
            className={`${itemClass(activeFor(ADMIN_ROUTES.system.integrations))} mt-2 whitespace-nowrap border-t border-sidebar-border pt-2 ${collapsed ? "mx-auto size-8 justify-center px-0" : "px-2.5"}`}
          >
            <IconApps className="size-4 shrink-0 opacity-80" stroke={1.7} />
            {!collapsed && <span>Apps</span>}
          </Link>
        </div>
      </SidebarContent>

      <SidebarFooter className={`mt-auto shrink-0 ${collapsed ? "p-2" : "p-3"}`}>
        <SidebarMenu className="gap-0.5">
          <SidebarMenuItem className={collapsed ? "hidden" : undefined}>
            <SidebarMenuButton
              render={
                <a href="mailto:hello@zerocraft.in?subject=CMS%20support" />
              }
              className={`h-8 rounded-xl px-2.5 text-[13px] text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${collapsed ? "mx-auto size-8! flex-none justify-center p-2" : ""}`}
            >
              <IconHelpCircle className="size-4" />
              {!collapsed && <span>Help &amp; support</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<Link href={scopedPath("/settings", pathname)} />}
              isActive={activeFor("/settings")}
              className={`h-8 rounded-xl px-2.5 text-[13px] ${collapsed ? "mx-auto size-8! flex-none justify-center p-2" : ""} ${activeFor("/settings") ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
            >
              <IconSettings className="size-4" />
              {!collapsed && <span>Settings</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <div
          className={`flex items-center ${collapsed ? "justify-center gap-1 flex-col-reverse" : "gap-2 flex-row"}`}
        >
           <AccountMenu
            collapsed={collapsed}
            pathname={pathname}
            user={user}
            isSigningOut={isSigningOut}
            onSignOut={onSignOut}
          />
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
