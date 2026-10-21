"use client";

import { useState } from "react";
import Link from "next/link";
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconHelpCircle,
  IconLogout,
  IconBell,
  IconSearch,
  IconSettings,
  IconWorld,
} from "@tabler/icons-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import {
  type AdminNavigationGroup,
  isAdminNavigationGroupActive,
  isAdminRouteActive,
} from "@/lib/admin-navigation";

type StudioSidebarProps = {
  pathname: string;
  user: { name: string; email: string; role: string };
  navigation: readonly AdminNavigationGroup[];
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  onOpenSearch: () => void;
  unread: number;
  onToggleNotices: () => void;
  isSigningOut: boolean;
  onSignOut: () => void;
};

export function StudioSidebar({
  pathname,
  user,
  navigation,
  collapsed,
  onCollapsedChange,
  onOpenSearch,
  unread,
  onToggleNotices,
  isSigningOut,
  onSignOut,
}: StudioSidebarProps) {
  const [expandedGroups, setExpandedGroups] = useState<string[]>(() =>
    navigation.filter((group) => isAdminNavigationGroupActive(pathname, group)).map((group) => group.label),
  );

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 hidden flex-col border-r border-sidebar-border/80 bg-sidebar/95 text-sidebar-foreground shadow-[12px_0_40px_rgba(15,23,42,0.04)] backdrop-blur-xl transition-[width] duration-200 lg:flex ${collapsed ? "w-[72px]" : "w-[280px]"}`}
    >
      <SidebarHeader className="relative flex h-[76px] flex-row items-center justify-center px-4 py-0">
        <Link
          href="/"
          aria-label="ZeroCraft home"
          className="grid size-11 place-items-center rounded-2xl bg-[#151515] shadow-[0_8px_22px_rgba(0,0,0,0.12)] transition-transform hover:scale-105"
        >
          <img src="/icon.svg" alt="" className="size-7" />
        </Link>
        <button
          type="button"
          onClick={() => onCollapsedChange(!collapsed)}
          className={`absolute top-4 grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${collapsed ? "-right-4 border border-border bg-background shadow-sm" : "right-3"}`}
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
        >
          {collapsed ? (
            <IconChevronRight className="size-4" />
          ) : (
            <IconChevronLeft className="size-4" />
          )}
        </button>
      </SidebarHeader>

      {!collapsed && (
        <div className="px-3">
          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-xl border border-sidebar-border bg-background/70 px-2.5 py-2 text-left shadow-sm transition-colors hover:bg-sidebar-accent"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-foreground text-xs font-bold text-background">
              {(user.name || "Z").slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold">{user.name || "ZeroCraft"}</span>
              <span className="block truncate text-[11px] text-muted-foreground">{user.role || "Administrator"}</span>
            </span>
            <IconChevronDown className="size-3.5 text-muted-foreground" />
          </button>

          <button
            type="button"
            onClick={onOpenSearch}
            className="mt-2 flex h-10 w-full items-center gap-2.5 rounded-lg border border-sidebar-border bg-background px-3 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
          >
            <IconSearch className="size-4" />
            <span className="flex-1 text-left">Search</span>
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px]">Ctrl K</kbd>
          </button>

          <div className="mt-3 rounded-2xl border border-sidebar-border/70 bg-sidebar-accent/60 p-3 shadow-sm">
            <div className="flex items-center justify-between text-[11px] font-medium">
              <span>Complete your setup</span>
              <span className="text-muted-foreground">100%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
              <div className="h-full w-full rounded-full bg-foreground" />
            </div>
            <p className="mt-2 text-[11px] leading-4 text-muted-foreground">Your workspace is ready for daily operations.</p>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => undefined}
        className="hidden"
      >
        {!collapsed && (
          <>
            <span className="flex-1 text-left">Search</span>
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px]">
              ⌘K
            </kbd>
          </>
        )}
      </button>

      <SidebarContent
        className={`mt-4 px-3 pb-5 [scrollbar-width:none] ${collapsed ? "overflow-visible" : "overflow-y-auto"}`}
      >
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu aria-label="CMS navigation" className="gap-1">
              {navigation.map((group) => {
                const groupActive = isAdminNavigationGroupActive(
                  pathname,
                  group,
                );
                const childLinks = group.links.filter(
                  (link) => link.href !== group.href,
                );
                const GroupIcon = group.icon;
                const groupExpanded = expandedGroups.includes(group.label) || groupActive;

                return (
                  <Collapsible
                    key={group.label}
                    open={groupExpanded}
                    onOpenChange={(open) =>
                      setExpandedGroups((current) =>
                        open
                          ? [...new Set([...current, group.label])]
                          : current.filter((label) => label !== group.label),
                      )
                    }
                  >
                  <SidebarMenuItem>
                    {collapsed && childLinks.length > 0 ? (
                      <HoverCard>
                        <HoverCardTrigger
                          delay={100}
                          closeDelay={100}
                          render={
                            <SidebarMenuButton
                              isActive={groupActive}
                              aria-label={group.label}
                              tabIndex={-1}
                              onPointerDown={(event) => event.preventDefault()}
                              className={`h-10 justify-center rounded-lg px-0 ${groupActive ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"}`}
                            />
                          }
                        >
                          <GroupIcon className="size-[18px]" stroke={1.7} />
                        </HoverCardTrigger>
                        <HoverCardContent
                          side="right"
                          align="start"
                          sideOffset={8}
                          className="w-48 p-1.5"
                        >
                          <p className="px-2.5 pb-1.5 pt-1 text-xs font-semibold">
                            {group.label}
                          </p>
                          <div className="space-y-0.5">
                            {childLinks.map(({ label, href }) => {
                              const active = isAdminRouteActive(pathname, href);
                              return (
                                <Button
                                  key={href}
                                  render={<Link href={href} />}
                                  nativeButton={false}
                                  variant={active ? "secondary" : "ghost"}
                                  size="sm"
                                  className="w-full justify-start"
                                >
                                  {label}
                                </Button>
                              );
                            })}
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    ) : (
                      <div className="relative">
                        <SidebarMenuButton
                          render={<Link href={group.href} />}
                          tooltip={collapsed ? group.label : undefined}
                          isActive={pathname === group.href}
                          aria-current={pathname === group.href ? "page" : undefined}
                          className={`h-10 rounded-lg ${collapsed ? "justify-center px-0" : "gap-3 px-3 pr-9"} ${pathname === group.href ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground" : groupActive ? "font-semibold text-foreground" : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"}`}
                        >
                          <GroupIcon className="size-[18px]" stroke={1.7} />
                          {!collapsed && <span>{group.label}</span>}
                        </SidebarMenuButton>
                        {!collapsed && childLinks.length > 0 && (
                          <CollapsibleTrigger
                            className="absolute right-1 top-1 grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                            aria-label={`${groupExpanded ? "Collapse" : "Expand"} ${group.label}`}
                          >
                            <IconChevronDown className={`size-3.5 transition-transform ${groupExpanded ? "rotate-180" : ""}`} />
                          </CollapsibleTrigger>
                        )}
                      </div>
                    )}

                    {!collapsed && childLinks.length > 0 && (
                      <CollapsibleContent>
                      <SidebarMenuSub className="mx-0 mb-1 mt-0.5 space-y-0.5 border-0 px-0 py-0.5">
                        {childLinks.map(({ label, href }) => {
                          const active = isAdminRouteActive(pathname, href);
                          return (
                            <SidebarMenuSubItem key={href}>
                              <SidebarMenuSubButton
                                render={<Link href={href} />}
                                isActive={active}
                                aria-current={active ? "page" : undefined}
                                className={`min-h-8 rounded-lg py-1 pl-9 pr-2.5 text-[13px] ${active ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"}`}
                              >
                                {label}
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                      </CollapsibleContent>
                    )}
                  </SidebarMenuItem>
                  </Collapsible>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/70 bg-sidebar/80 p-3">
        <SidebarMenu>
          {!collapsed && (
            <SidebarMenuItem>
              <SidebarMenuButton
                render={<Link href="/channels" />}
                className="h-10 rounded-xl gap-3 px-3 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              >
                <IconWorld className="size-[18px]" />
                <span>Channels</span>
                <span className="ml-auto rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">Live</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={onToggleNotices}
              className={`h-10 rounded-xl ${collapsed ? "justify-center px-0" : "gap-3 px-3"} text-muted-foreground hover:bg-sidebar-accent hover:text-foreground`}
              aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
            >
              <span className="relative">
                <IconBell className="size-[18px]" />
                {unread > 0 && (
                  <span className="absolute -right-2 -top-2 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold leading-none text-primary-foreground">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </span>
              {!collapsed && <span>Notifications</span>}
              {!collapsed && unread > 0 && (
                <span className="ml-auto text-xs font-semibold text-primary">{unread > 99 ? "99+" : unread}</span>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<Link href="/settings" />}
              tooltip="Settings"
              isActive={isAdminRouteActive(pathname, "/settings")}
              aria-current={
                isAdminRouteActive(pathname, "/settings") ? "page" : undefined
              }
              className={`h-10 rounded-xl ${collapsed ? "justify-center px-0" : "gap-3 px-3"} ${isAdminRouteActive(pathname, "/settings") ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"}`}
            >
              <IconSettings className="size-[18px]" />
              {!collapsed && <span>Settings</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<a href="mailto:hello@zerocraft.in?subject=CMS%20support" />}
              tooltip="Help & support"
              className={`h-10 rounded-xl ${collapsed ? "justify-center px-0" : "gap-3 px-3"} text-muted-foreground hover:bg-sidebar-accent hover:text-foreground`}
            >
              <IconHelpCircle className="size-[18px]" />
              {!collapsed && <span>Help & support</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              disabled={isSigningOut}
              onClick={onSignOut}
              tooltip="Log out"
              className={`h-10 rounded-xl ${collapsed ? "justify-center px-0" : "gap-3 px-3"} text-muted-foreground hover:bg-destructive/10 hover:text-destructive`}
            >
              <IconLogout className="size-[18px]" />
              {!collapsed && <span>{isSigningOut ? "Logging out…" : "Log out"}</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </aside>
  );
}
