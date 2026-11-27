"use client";

import Link from "next/link";
import {
  IconHelpCircle,
  IconLogout,
  IconSettings,
  IconShieldCheck,
  IconUserCircle,
} from "@tabler/icons-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@zerocraft/components/ui/dropdown-menu";
import { scopedPath } from "@/lib/platform/scope";
import { StoreMenuItems } from "@/components/navigations/store-switcher";

type AccountMenuProps = {
  collapsed: boolean;
  pathname: string;
  user: { name: string; email: string };
  isSigningOut: boolean;
  onSignOut: () => void;
};

function initials(name: string, email: string) {
  const source = name.trim() || email.split("@")[0] || "Z";
  return (
    source
      .split(/[ ._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "Z"
  );
}

export function AccountMenu({
  collapsed,
  pathname,
  user,
  isSigningOut,
  onSignOut,
}: AccountMenuProps) {
  const displayName = user.name || "Zerocraft account";
  const avatar = initials(displayName, user.email);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            data-account-menu
            aria-label={`Manage account for ${displayName}`}
            title={collapsed ? displayName : undefined}
            className={`flex h-9 min-h-9 items-center gap-2 rounded-xl p-1.5 text-left text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring data-[state=open]:bg-sidebar-accent ${collapsed ? "mx-auto size-9 justify-center" : "w-full"}`}
          >
            <span className="grid size-6 shrink-0 place-items-center rounded-md bg-primary text-[10px] font-semibold text-secondary">
              {avatar}
            </span>
            {!collapsed && (
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
                {displayName}
              </span>
            )}
          </button>
        }
      />
      <DropdownMenuContent
        side="top"
        align={collapsed ? "center" : "start"}
        sideOffset={8}
        className="w-72 rounded-xl p-2 shadow-xl"
      >
        <DropdownMenuLabel className="flex items-center gap-2 px-2.5 py-2 font-normal">
          <span className="grid size-7 place-items-center rounded-md bg-sidebar-primary text-[10px] font-semibold text-sidebar-primary-foreground">
            {avatar}
          </span>
          <span className="grid min-w-0 text-left leading-tight">
            <span className="truncate text-[13px] font-medium">
              {displayName}
            </span>
            <span className="truncate text-[11px] text-muted-foreground">
              {user.email}
            </span>
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <StoreMenuItems />
        <DropdownMenuSeparator />
        <DropdownMenuItem
          render={<Link href={scopedPath("/settings", pathname)} />}
          className="min-h-9 gap-2 rounded-lg"
        >
          <IconSettings className="size-4" />
          <span>Manage account</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          render={<Link href={scopedPath("/settings/users", pathname)} />}
          className="min-h-9 gap-2 rounded-lg"
        >
          <IconShieldCheck className="size-4" />
          <span>Users &amp; permissions</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          render={<a href="mailto:hello@zerocraft.in?subject=CMS%20support" />}
          className="min-h-9 gap-2 rounded-lg"
        >
          <IconHelpCircle className="size-4" />
          <span>Help &amp; support</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={isSigningOut}
          onClick={onSignOut}
          className="min-h-9 gap-2 rounded-lg"
        >
          <IconLogout className="size-4" />
          <span>{isSigningOut ? "Logging out…" : "Log out"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
