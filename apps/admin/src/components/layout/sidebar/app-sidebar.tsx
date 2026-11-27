"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { Bell, LogOut, Settings } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@zerocraft/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@zerocraft/ui/avatar";

import { NavMain } from "./nav-main";
import { NavProjects } from "./nav-projects";
import { SearchForm } from "./search-form";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarTrigger,
  useSidebar,
} from "@zerocraft/ui/sidebar";

type Team = {
  id: string;
  name: string;
  logo: LucideIcon;
  plan: string;
};

type NavItem = {
  title: string;
  url: string;
  icon?: LucideIcon;
  isActive?: boolean;
  section?: string;
  items?: { title: string; url: string }[];
};

type Project = {
  name: string;
  url: string;
  icon: LucideIcon;
};

export type AppSidebarData = {
  user: {
    name: string;
    email: string;
    avatar: string;
  };
  teams: Team[];
  navMain: NavItem[];
  navSecondary: NavItem[];
  projects: Project[];
};

export function AppSidebar({
  data,
  activeOrganizationId,
  onOrganizationChange,
  ...sidebarProps
}: React.ComponentProps<typeof Sidebar> & {
  data?: AppSidebarData;
  activeOrganizationId?: string;
  onOrganizationChange?: (organizationId: string) => void;
}) {
  const pathname = usePathname();
  const { state } = useSidebar();
  const [fallbackData, setFallbackData] = React.useState<AppSidebarData | null>(
    null,
  );

  React.useEffect(() => {
    if (data) {
      return;
    }

    let cancelled = false;

    // Fall back to fetching user session client-side when no server data is
    // provided (e.g. used directly outside DashboardShell).
    (async () => {
      const { createBrowserSupabaseClient } =
        await import("@/lib/supabase/client");
      const supabase = createBrowserSupabaseClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;

      if (!user || cancelled) {
        return;
      }

      setFallbackData({
        user: {
          name:
            user.user_metadata?.full_name ??
            user.email?.split("@")[0] ??
            "User",
          email: user.email ?? "",
          avatar: user.user_metadata?.avatar_url ?? "/avatars/default.jpg",
        },
        teams: [],
        navMain: [],
        navSecondary: [],
        projects: [],
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [data]);

  const sidebarData = data ?? fallbackData;

  const [logoutLoading, setLogoutLoading] = React.useState(false);
  const router = useRouter();

  const handleLogout = () => {
    if (logoutLoading) {
      return;
    }

    // Central logout clears both the admin session and the accounts session.
    setLogoutLoading(true);
    router.push("/auth/logout");
  };

  if (!sidebarData) {
    return null;
  }

  return (
    <Sidebar collapsible="icon" {...sidebarProps} className="">
      <SidebarHeader className="px-3 py-4">
        <div className="group/logo relative flex h-7 items-center gap-2">
          <span
            className={`flex size-7 shrink-0 items-center justify-center rounded-md bg-[#95bf47] text-white transition-opacity duration-150 ease-out ${state === "collapsed" ? "group-hover/logo:opacity-0" : ""}`}
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="size-5 fill-current"
            >
              <path d="M7 8.5 8.8 4h6.4L17 8.5v9.7A1.8 1.8 0 0 1 15.2 20H8.8A1.8 1.8 0 0 1 7 18.2V8.5Zm2.1-.7h5.8l-.8-2H9.9l-.8 2Zm1.6 2.7 1.3-.8 1.3.8v-5.2h-2.6Z" />
            </svg>
          </span>
          <SidebarTrigger
            aria-label="Collapse sidebar"
            className="ml-auto size-8  shrink-0 text-sidebar-muted hover:bg-sidebar-hover! hover:text-white group-data-[collapsible=icon]:hidden"
          />
          <SidebarTrigger
            aria-label="Expand sidebar"
            className="pointer-events-none absolute left-0 top-0 hidden size-7 text-sidebar-muted opacity-0 transition-opacity duration-150 ease-out hover:bg-sidebar-hover! hover:text-white group-data-[collapsible=icon]:flex group-hover/logo:pointer-events-auto group-hover/logo:opacity-100"
          />
        </div>
      </SidebarHeader>
      <SidebarContent className="no-scrollbar px-3 space-y-4">
        <SearchForm />
        <NavMain items={sidebarData.navMain} />
        {sidebarData.projects.length > 0 && (
          <NavProjects projects={sidebarData.projects} />
        )}
      </SidebarContent>
      <SidebarFooter className="items-center gap-0 border-t border-transparent px-3 py-2 space-y-1">
        {/* <Link
          href="/settings/product-categories"
          aria-current={pathname === "/settings/product-categories" ? "page" : undefined}
          className="flex !h-7 !w-full items-center gap-2 overflow-hidden rounded-lg !px-2 text-[13px] text-sidebar-foreground hover:bg-sidebar-hover data-[active=true]:bg-sidebar-accent group-data-[collapsible=icon]:!mx-auto group-data-[collapsible=icon]:!w-8 group-data-[collapsible=icon]:justify-center"
          data-active={pathname === "/settings/product-categories"}
        >
          <Tags className="size-4 shrink-0 group-data-[collapsible=icon]:!mx-auto" />
          <span className="min-w-0 truncate whitespace-nowrap transition-opacity duration-150 group-data-[collapsible=icon]:hidden">
            Product categories
          </span>
        </Link> */}
        <Link
          href="/settings"
          aria-current={pathname.startsWith("/settings") ? "page" : undefined}
          className="flex !h-7 !w-full items-center gap-2 overflow-hidden rounded-lg !px-2 text-[13px] text-sidebar-foreground hover:bg-sidebar-hover data-[active=true]:bg-sidebar-accent group-data-[collapsible=icon]:!mx-auto group-data-[collapsible=icon]:!w-8 group-data-[collapsible=icon]:justify-center"
          data-active={pathname.startsWith("/settings")}
        >
          <Settings className="size-4 shrink-0 group-data-[collapsible=icon]:!mx-auto" />
          <span className="min-w-0 truncate whitespace-nowrap transition-opacity duration-150 group-data-[collapsible=icon]:hidden">
            Settings
          </span>
        </Link>
        {sidebarData.teams.length > 1 && (
          <select
            aria-label="Active organization"
            value={activeOrganizationId ?? ""}
            onChange={(event) => onOrganizationChange?.(event.target.value)}
            className="h-8 w-full truncate rounded-lg border border-sidebar-border bg-sidebar px-2 text-xs text-sidebar-foreground group-data-[collapsible=icon]:hidden"
          >
            {sidebarData.teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        )}
        <div className="mx-auto flex h-7 w-full items-center pl-1  justify-center gap-2 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:flex-col-reverse group-data-[collapsible=icon]:h-auto group-data-[collapsible=icon]:gap-1 group-data-[collapsible=icon]:px-0">
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex items-center  py-1 pr-2 gap-2 hover:bg-primary-foreground/10 rounded-lg group-data-[collapsible=icon]:p-0"
            >
              <span className="flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-sidebar-avatar text-[7px] font-semibold leading-none tracking-tight text-black">
                MAR
              </span>
              <span className="min-w-0 flex-1 truncate whitespace-nowrap text-[13px] font-semibold text-sidebar-foreground transition-opacity duration-150 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:hidden">
                {sidebarData.user.name}
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="min-w-56 rounded-lg"
              align="end"
              sideOffset={4}
            >
              <DropdownMenuGroup>
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      {sidebarData.user.avatar ? (
                        <AvatarImage src={sidebarData.user.avatar} alt={sidebarData.user.name} />
                      ) : null}
                      <AvatarFallback className="rounded-lg">
                        {sidebarData.user.name.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {sidebarData.user.name}
                      </span>
                      <span className="truncate text-xs">{sidebarData.user.email}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                disabled={logoutLoading}
                aria-busy={logoutLoading}
              >
                <LogOut className="mr-2 size-4" />
                {logoutLoading ? "Signing out..." : "Sign out"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            type="button"
            aria-label="Notifications"
            className="ml-auto flex size-7 shrink-0 items-center justify-center rounded-lg text-sidebar-muted hover:bg-sidebar-hover hover:text-white group-data-[collapsible=icon]:ml-0"
          >
            <Bell className="size-3.5" />
          </button>
        </div>
      </SidebarFooter>
      {/* not set a sidebar rail */}
      {/* <SidebarRail /> */}
    </Sidebar>
  );
}
