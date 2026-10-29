"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  IconBell,
  IconChartBar,
  IconFileText,
  IconHelpCircle,
  IconPlus,
  IconSearch,
  IconSettings,
  IconShoppingBag,
  IconTrendingUp,
  IconUsers,
  IconWorld,
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
import { ADMIN_ROUTES } from "@/lib/admin-routes";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { cn } from "@/lib/utils";

type StudioSidebarProps = {
  pathname: string;
  navigation: readonly AdminNavigationGroup[];
  collapsed: boolean;
  onOpenSearch: () => void;
  collapsedTriggerSuppressed: boolean;
  onCollapsedTriggerReveal: () => void;
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
  collapsed,
  onOpenSearch,
  collapsedTriggerSuppressed,
  onCollapsedTriggerReveal,
}: StudioSidebarProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {},
  );
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
  const sourceGroups = useMemo(
    () => new Map(navigation.map((group) => [group.label, group])),
    [navigation],
  );
  const presentationNavigation = useMemo<
    readonly SidebarPresentationGroup[]
  >(() => {
    const link = (href: AdminNavigationLink["href"]) => sourceLinks.get(href);
    const group = (label: string) => sourceGroups.get(label);
    const withLabel = (
      item: AdminNavigationLink,
      label: string,
      href = item.href,
    ): AdminNavigationLink => ({ ...item, label, href });
    const productsSource = group("Store");
    const studioSource = group("Studio");
    const commerceAvailable = Boolean(productsSource);
    const addGroup = (
      label: string,
      href: AdminNavigationLink["href"],
      icon: AdminNavigationLink["icon"],
      links: readonly AdminNavigationLink[] = [],
    ) => ({ label, href, icon, links });
    const result: SidebarPresentationGroup[] = [];

    const home = link(ADMIN_ROUTES.overview);
    if (home) result.push(addGroup("Home", home.href, home.icon, []));
    const orders = link(ADMIN_ROUTES.operations.orders);
    if (orders) result.push(addGroup("Orders", orders.href, orders.icon, []));

    const products = link(ADMIN_ROUTES.store.products);
    if (commerceAvailable && products) {
      const productChildren = [
        link(ADMIN_ROUTES.store.categories) &&
          withLabel(link(ADMIN_ROUTES.store.categories)!, "Collections"),
        link(ADMIN_ROUTES.store.inventory),
        orders &&
          withLabel(
            orders,
            "Purchase orders",
            ADMIN_ROUTES.operations.purchaseOrders,
          ),
        link(ADMIN_ROUTES.store.mediaLibrary) &&
          withLabel(link(ADMIN_ROUTES.store.mediaLibrary)!, "Transfers"),
      ].filter(Boolean) as AdminNavigationLink[];
      result.push(
        addGroup(
          "Products",
          ADMIN_ROUTES.store.overview,
          IconShoppingBag,
          productChildren,
        ),
      );
    }

    const customers = link(ADMIN_ROUTES.studio.clients);
    const customerChildren = [
      link(ADMIN_ROUTES.studio.segments),
      link(ADMIN_ROUTES.studio.companies),
    ].filter(Boolean) as AdminNavigationLink[];
    if (customers)
      result.push(addGroup("Customers", customers.href, IconUsers, customerChildren));
    const growth = link(ADMIN_ROUTES.operations.growth);
    if (growth)
      result.push(addGroup("Growth", growth.href, IconTrendingUp, []));
    const content = link(ADMIN_ROUTES.studio.content);
    const contentChildren = [
      link(ADMIN_ROUTES.studio.metaobjects),
      link(ADMIN_ROUTES.studio.files),
      link(ADMIN_ROUTES.studio.menus),
      link(ADMIN_ROUTES.studio.blogPosts),
    ].filter(Boolean) as AdminNavigationLink[];
    if (content)
      result.push(addGroup("Content", content.href, IconFileText, contentChildren));
    if (commerceAvailable)
      result.push(
        addGroup("Markets", ADMIN_ROUTES.store.channels, IconWorld, []),
      );
    const reports = link(ADMIN_ROUTES.operations.reportLibrary);
    const liveView = link(ADMIN_ROUTES.operations.liveView);
    const analyticsChildren = [reports, liveView].filter(Boolean) as AdminNavigationLink[];
    if (analyticsChildren.length)
      result.push(addGroup("Analytics", ADMIN_ROUTES.operations.analytics, IconChartBar, analyticsChildren));
    return result;
  }, [sourceGroups, sourceLinks]);

  useEffect(() => {
    const active = presentationNavigation.find(
      (group) =>
        group.links.some((link) => isAdminRouteActive(pathname, link.href)) ||
        isAdminRouteActive(pathname, group.href),
    );
    if (active)
      setExpandedGroups((current) => ({ ...current, [active.label]: true }));
    if (isAdminRouteActive(pathname, "/channels")) setChannelsOpen(true);
    if (isAdminRouteActive(pathname, "/integrations")) setAppsOpen(true);
  }, [navigation, pathname, presentationNavigation]);

  const hiddenToggle = (
    label: string,
    expanded: boolean,
    onClick: () => void,
  ) => (
    <button
      type="button"
      aria-label={`${expanded ? "Collapse" : "Expand"} ${label}`}
      aria-expanded={expanded}
      onClick={onClick}
      className="size-1 shrink-0 overflow-hidden opacity-0 focus-visible:size-8 focus-visible:opacity-100"
    >
      <span className="sr-only">
        {expanded ? "Collapse" : "Expand"} {label}
      </span>
    </button>
  );

  const itemClass = (active: boolean, child = false) =>
    `flex h-8 min-h-8 items-center rounded-xl p-2 text-[13px] transition-colors duration-150 ${child ? "pl-8" : ""} ${active ? "!bg-[#303033] font-semibold !text-[#f1f1f1]" : "!text-[#b4b4b8] hover:!bg-[#242426] hover:!text-[#f1f1f1]"}`;

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
          className={`mb-3 flex size-8 items-center rounded-xl border border-[#454548] bg-[#303033] text-left text-[13px] text-[#b4b4b8] transition-colors hover:bg-[#3a3a3d] hover:text-[#f1f1f1] ${collapsed ? "mx-auto justify-center" : "w-full gap-2 px-2.5"}`}
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
                const parentActive = pathname === group.href;
                const childActive = group.links.some((link) =>
                  isAdminRouteActive(pathname, link.href),
                );
                const expanded =
                  !collapsed &&
                  (expandedGroups[group.label] ??
                    (parentActive || childActive));
                const GroupIcon = group.icon;
                return (
                  <div key={group.label} className="contents">
                    <SidebarMenuItem className="mt-0.5 first:mt-0">
                      <div className="flex items-center">
                        <SidebarMenuButton
                          render={<Link href={group.href} />}
                          isActive={parentActive}
                          aria-current={parentActive ? "page" : undefined}
                          title={collapsed ? group.label : undefined}
                          className={`${itemClass(parentActive)} min-w-0 flex-1 ${collapsed ? "mx-auto size-8! flex-none justify-center" : "w-full"} ${childActive && !parentActive ? "font-medium text-foreground" : ""}`}
                        >
                          <GroupIcon className="size-4 shrink-0" stroke={1.7} />
                          {!collapsed && (
                            <span className="truncate">{group.label}</span>
                          )}
                        </SidebarMenuButton>
                        {!collapsed &&
                          group.links.length > 0 &&
                          hiddenToggle(group.label, expanded, () =>
                            setExpandedGroups((current) => ({
                              ...current,
                              [group.label]: !expanded,
                            })),
                          )}
                      </div>
                    </SidebarMenuItem>
                    {expanded && group.links.length > 0 && (
                      <div className="overflow-hidden">
                        <div className="py-0.5">
                          {group.links.map((link) => {
                            const active = isAdminRouteActive(
                              pathname,
                              link.href,
                            );
                            return (
                              <div
                                key={`${group.label}-${link.label}`}
                                className="w-full"
                              >
                                <SidebarMenuItem>
                                  <SidebarMenuButton
                                    render={<Link href={link.href} />}
                                    isActive={active}
                                    aria-current={active ? "page" : undefined}
                                    className={itemClass(active, true)}
                                  >
                                    <span className="truncate">
                                      {link.label}
                                    </span>
                                  </SidebarMenuButton>
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
        <div className="mt-4 pt-3">
          <button
            type="button"
            onClick={() => setChannelsOpen((value) => !value)}
            aria-expanded={channelsOpen}
            className={`flex h-8 min-h-8 w-full items-center rounded-xl p-2 text-left text-[11px] font-semibold text-muted-foreground hover:bg-muted/70 hover:text-foreground ${collapsed ? "mx-auto size-8! flex-none justify-center text-[9px]" : ""}`}
          >
            {collapsed ? "SC" : "Sales channels"}
            <span className="sr-only">
              {channelsOpen ? "Collapse" : "Expand"} Sales channels
            </span>
          </button>
          {channelsOpen && !collapsed && (
            <div className="overflow-hidden">
              <div>
                <Link
                  href="/channels"
                  className={itemClass(
                    isAdminRouteActive(pathname, "/channels"),
                    true,
                  )}
                >
                  Online Store
                </Link>
              </div>
              <div>
                <Link
                  href="/integrations"
                  className={itemClass(
                    isAdminRouteActive(pathname, "/integrations"),
                    true,
                  )}
                >
                  Agentic
                </Link>
              </div>
            </div>
          )}
          <div className="mt-0.5 flex items-center">
            <button
              type="button"
              onClick={() => setAppsOpen((value) => !value)}
              aria-expanded={appsOpen}
              title="Apps"
              className={`flex h-8 min-h-8 min-w-0 flex-1 items-center rounded-xl p-2 text-[13px] text-muted-foreground hover:bg-muted/70 hover:text-foreground ${collapsed ? "mx-auto size-8! flex-none justify-center" : ""}`}
            >
              {!collapsed && <span>Apps</span>}
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
            <div className="overflow-hidden">
              <div>
                <Link
                  href="/integrations"
                  className={itemClass(
                    isAdminRouteActive(pathname, "/integrations"),
                    true,
                  )}
                >
                  Add
                </Link>
              </div>
            </div>
          )}
        </div>
      </SidebarContent>
      <SidebarFooter className={`mt-auto${collapsed ? "p-2" : "p-3"}`}>
        <SidebarMenu className="gap-0.5">
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<Link href="/notifications" />}
              title={collapsed ? "Alerts" : undefined}
              className={`h-8 rounded-xl px-2.5 text-[13px] text-muted-foreground hover:bg-muted/70 hover:text-foreground ${collapsed ? "mx-auto size-8! flex-none justify-center p-2" : ""}`}
            >
              <IconBell className="size-4" />
              {!collapsed && <span>Alerts</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={
                <a href="mailto:hello@zerocraft.in?subject=CMS%20support" />
              }
              title={collapsed ? "Help & support" : undefined}
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
              title={collapsed ? "Settings" : undefined}
              className={`h-8 rounded-xl px-2.5 text-[13px] ${collapsed ? "mx-auto size-8! flex-none justify-center p-2" : ""} ${isAdminRouteActive(pathname, "/settings") ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"}`}
            >
              <IconSettings className="size-4" />
              {!collapsed && <span>Settings</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </SidebarPrimitive>
  );
}
