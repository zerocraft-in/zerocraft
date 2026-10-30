"use client";

import Link from "next/link";
import { ChevronsUpDown, Plus } from "lucide-react";
import {
  IconBriefcase,
  IconLogout,
  IconHelpCircle,
  IconUserCircle,
  IconShoppingBag,
} from "@tabler/icons-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ADMIN_ROUTES } from "@/lib/admin-routes";

type WorkspaceSwitcherProps = {
  pathname: string;
  collapsed: boolean;
  user: { name: string; email: string };
  isSigningOut: boolean;
  onSignOut: () => void;
};

type Workspace = {
  id: "studio" | "store";
  label: string;
  description: string;
  href: string;
  icon: typeof IconBriefcase;
};

const workspaces: readonly Workspace[] = [
  {
    id: "studio",
    label: "Zerocraft Studio",
    description: "Clients, projects & content",
    href: ADMIN_ROUTES.studio.overview,
    icon: IconBriefcase,
  },
  {
    id: "store",
    label: "Zerocraft Store",
    description: "Products, orders & inventory",
    href: ADMIN_ROUTES.store.overview,
    icon: IconShoppingBag,
  },
];

function currentWorkspace(pathname: string): Workspace {
  const isStore =
    pathname === "/store" ||
    pathname.startsWith("/store/") ||
    pathname === "/orders" ||
    pathname.startsWith("/orders/");

  return (
    workspaces.find(
      (workspace) => workspace.id === (isStore ? "store" : "studio"),
    ) || workspaces[0]
  );
}

export function WorkspaceSwitcher({
  pathname,
  collapsed,
  user,
  isSigningOut,
  onSignOut,
}: WorkspaceSwitcherProps) {
  const current = currentWorkspace(pathname);
  const CurrentIcon = current.icon;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label={`Switch workspace. Current workspace: ${current.label}`}
            title={collapsed ? current.label : undefined}
            data-workspace-switcher
            className={`group flex h-8 min-h-8 w-max items-center gap-1 rounded-xl p-2 text-left text-[13px] text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-muted/70 data-[state=open]:text-foreground ${collapsed ? "mx-auto size-8! justify-center px-0" : "w-full"}`}
          >
            <span className="grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground">
              <CurrentIcon className="size-4" stroke={1.8} />
            </span>
            {!collapsed && (
              <span className="grid min-w-0 flex-1 text-left text-[13px] leading-tight">
                <span className="truncate capitalize ">{current.id}</span>
              </span>
            )}
          </button>
        }
      />
      <DropdownMenuContent
        side="left"
        align={collapsed ? "center" : "start"}
        sideOffset={7}
        className="w-60 min-w-56 rounded-xl border-border bg-popover p-1.5 text-popover-foreground shadow-lg"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2.5 py-1.5 text-xs font-normal text-muted-foreground">
            Workspaces
          </DropdownMenuLabel>
          {workspaces.map((workspace) => {
            const WorkspaceIcon = workspace.icon;
            const active = workspace.id === current.id;
            return (
              <DropdownMenuItem
                key={workspace.id}
                className="min-h-10 gap-2 rounded-lg px-2 py-2 text-popover-foreground focus:bg-accent focus:text-accent-foreground"
                render={
                  <Link
                    href={workspace.href}
                    aria-current={active ? "page" : undefined}
                  />
                }
              >
                <span
                  className={`grid size-6 place-items-center rounded-md border border-border ${active ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}
                >
                  <WorkspaceIcon className="size-3.5" stroke={1.8} />
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
                  {workspace.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  ⌘{workspaces.indexOf(workspace) + 1}
                </span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem
          className="min-h-9 gap-2 rounded-lg text-popover-foreground focus:bg-accent focus:text-accent-foreground"
          disabled
        >
          <span className="grid size-6 place-items-center rounded-md border border-border">
            <Plus className="size-4" />
          </span>
          <span className="font-medium text-muted-foreground">
            Create workspace
          </span>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem
          className="min-h-10 gap-2 rounded-lg text-popover-foreground focus:bg-accent focus:text-accent-foreground"
          render={<Link href="/settings" />}
        >
          <IconUserCircle className="size-4 shrink-0" />
          <span className="grid min-w-0 text-left leading-tight">
            <span className="truncate text-[13px] font-medium">
              {user.name || "Zerocraft Studio"}
            </span>
            <span className="truncate text-[11px] text-muted-foreground">
              {user.email}
            </span>
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="min-h-9 rounded-lg text-popover-foreground focus:bg-accent focus:text-accent-foreground"
          render={<a href="mailto:hello@zerocraft.in?subject=CMS%20support" />}
        >
          <IconHelpCircle className="size-4" /> Help Center
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          disabled={isSigningOut}
          className="min-h-9 rounded-lg"
          onClick={onSignOut}
        >
          <IconLogout className="size-4" />{" "}
          {isSigningOut ? "Logging out…" : "Log out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
