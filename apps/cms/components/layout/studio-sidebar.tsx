"use client";

import Link from "next/link";
import {
  IconChevronLeft,
  IconChevronRight,
  IconSearch,
  IconSettings,
} from "@tabler/icons-react";
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
  ADMIN_NAVIGATION,
  isAdminNavigationGroupActive,
  isAdminRouteActive,
} from "@/lib/admin-navigation";

type StudioSidebarProps = {
  pathname: string;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  onSearch: () => void;
};

function StudioMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
    >
      <path
        d="M5 7.5h14M5 12h9M5 16.5h14"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      <path
        d="m15.5 9.5 3 2.5-3 2.5"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function StudioSidebar({
  pathname,
  collapsed,
  onCollapsedChange,
  onSearch,
}: StudioSidebarProps) {
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 hidden flex-col bg-backgroundshadow-xl transition-[width] duration-200 lg:flex ${collapsed ? "w-[72px]" : "w-[272px]"}`}
    >
      <SidebarHeader className="relative flex h-16 flex-row items-center gap-3 border-b border-white/10 px-4 py-0">
        <Link
          href="/"
          className={`flex min-w-0 items-center gap-2.5 rounded-md px-1 py-1 text-white ${collapsed ? "flex-none" : "flex-1"}`}
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#95bf47] text-[#102a12]">
            <StudioMark className="size-4.5" />
          </span>
          {!collapsed && (
            <span className="truncate text-base font-semibold">ZeroCraft</span>
          )}
        </Link>
        <button
          type="button"
          onClick={() => onCollapsedChange(!collapsed)}
          className={`absolute top-4 grid size-8 place-items-center rounded-lg text-zinc-400 transition-colors hover:bg-white/10 hover:text-white ${collapsed ? "-right-4 border border-white/10 bg-[#242424] shadow-lg" : "right-3"}`}
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
        >
          {collapsed ? (
            <IconChevronRight className="size-4" />
          ) : (
            <IconChevronLeft className="size-4" />
          )}
        </button>
      </SidebarHeader>

      <button
        type="button"
        onClick={onSearch}
        className={`mx-3 mt-4 flex h-10 items-center rounded-lg bg-white/8 text-sm text-zinc-400 hover:bg-white/12 hover:text-white ${collapsed ? "justify-center px-0" : "gap-2.5 px-3"}`}
      >
        <IconSearch className="size-4 shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1 text-left">Search</span>
            <kbd className="rounded bg-white/8 px-1.5 py-0.5 text-[10px]">
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
            <SidebarMenu aria-label="CMS navigation">
              {ADMIN_NAVIGATION.map((group) => {
                const groupActive = isAdminNavigationGroupActive(
                  pathname,
                  group,
                );
                const childLinks = group.links.filter(
                  (link) => link.href !== group.href,
                );
                const GroupIcon = group.icon;

                return (
                  <SidebarMenuItem key={group.label}>
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
                              className={`h-10 justify-center rounded-lg px-0 ${groupActive ? "bg-[#303030] text-white" : "text-zinc-400 hover:bg-white/8 hover:text-zinc-100"}`}
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
                      <SidebarMenuButton
                        render={<Link href={group.href} />}
                        tooltip={collapsed ? group.label : undefined}
                        isActive={pathname === group.href}
                        aria-current={
                          pathname === group.href ? "page" : undefined
                        }
                        className={`h-10 rounded-lg ${collapsed ? "justify-center px-0" : "gap-3 px-3"} ${pathname === group.href ? "bg-[#303030] font-medium text-white" : groupActive ? "font-medium text-white" : "text-zinc-400 hover:bg-white/8 hover:text-zinc-100"}`}
                      >
                        <GroupIcon className="size-[18px]" stroke={1.7} />
                        {!collapsed && <span>{group.label}</span>}
                      </SidebarMenuButton>
                    )}

                    {!collapsed && groupActive && childLinks.length > 0 && (
                      <SidebarMenuSub className="mx-0 mb-1 mt-0.5 space-y-0.5 border-0 px-0 py-0.5">
                        {childLinks.map(({ label, href }) => {
                          const active = isAdminRouteActive(pathname, href);
                          return (
                            <SidebarMenuSubItem key={href}>
                              <SidebarMenuSubButton
                                render={<Link href={href} />}
                                isActive={active}
                                aria-current={active ? "page" : undefined}
                                className={`min-h-8 rounded-lg py-1 pl-9 pr-2.5 text-[13px] ${active ? "bg-[#303030] font-medium text-white" : "text-zinc-500 hover:bg-white/7 hover:text-zinc-200"}`}
                              >
                                {label}
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-white/10 p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<Link href="/settings" />}
              tooltip="Settings"
              isActive={isAdminRouteActive(pathname, "/settings")}
              aria-current={
                isAdminRouteActive(pathname, "/settings") ? "page" : undefined
              }
              className={`h-10 rounded-lg ${collapsed ? "justify-center px-0" : "gap-3 px-3"} ${isAdminRouteActive(pathname, "/settings") ? "bg-[#303030] font-medium text-white" : "text-zinc-400 hover:bg-white/8 hover:text-white"}`}
            >
              <IconSettings className="size-[18px]" />
              {!collapsed && <span>Settings</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </aside>
  );
}
