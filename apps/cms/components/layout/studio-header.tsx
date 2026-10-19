"use client";

import Link from "next/link";
import {
  IconBell,
  IconLogout,
  IconMenu2,
  IconSearch,
  IconSettings,
} from "@tabler/icons-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type StudioHeaderProps = {
  title: string;
  sidebarCollapsed: boolean;
  unread: number;
  noticesOpen: boolean;
  isSigningOut: boolean;
  user: { name: string; email: string; role: string };
  onOpenMobileMenu: () => void;
  onOpenSearch: () => void;
  onToggleNotices: () => void;
  onSignOut: () => void;
};

export function StudioHeader({
  title,
  sidebarCollapsed,
  unread,
  noticesOpen,
  isSigningOut,
  user,
  onOpenMobileMenu,
  onOpenSearch,
  onToggleNotices,
  onSignOut,
}: StudioHeaderProps) {
  return (
    <header className={`fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between gap-4 border-b border-border bg-background px-4 text-foreground transition-[left] duration-200 sm:px-6 ${sidebarCollapsed ? "lg:left-[72px]" : "lg:left-[272px]"}`}>
      <div className="flex min-w-0 items-center gap-2">
        <Button variant="ghost" size="icon" className="size-11 rounded-lg lg:hidden" onClick={onOpenMobileMenu} aria-label="Open navigation">
          <IconMenu2 className="size-5" />
        </Button>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold leading-tight">{title}</p>
          <p className="hidden text-xs leading-tight text-muted-foreground sm:block">ZeroCraft administration</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="size-11 rounded-lg" onClick={onOpenSearch} aria-label="Search pages">
          <IconSearch className="size-5" />
        </Button>
        <Button variant="ghost" size="icon" className="relative size-11 rounded-lg" onClick={onToggleNotices} aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} aria-expanded={noticesOpen}>
          <IconBell className="size-5" />
          {unread > 0 && <span className="absolute right-1 top-1 size-2 rounded-full bg-primary" />}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-11 rounded-lg" aria-label="Account menu">
              <Avatar className="size-9">
                <AvatarFallback className="rounded-lg text-xs">{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <div className="px-2 py-2">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              <p className="mt-1 text-xs text-muted-foreground">{user.role}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/settings" />}>
              <IconSettings className="mr-2 size-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={isSigningOut} onClick={onSignOut} variant="destructive">
              <IconLogout className="mr-2 size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
