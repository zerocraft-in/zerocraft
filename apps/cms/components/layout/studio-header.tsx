"use client";

import Link from "next/link";
import {
  IconBell,
  IconMenu2,
  IconPlus,
  IconSearch,
  IconHelpCircle,
  IconLogout,
  IconSettings,
  IconSparkles,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type StudioHeaderProps = {
  title: string;
  unread: number;
  noticesOpen: boolean;
  user: { name: string; role: string };
  email: string;
  isSigningOut: boolean;
  onOpenMobileMenu: () => void;
  onOpenSearch: () => void;
  onToggleNotices: () => void;
  onSignOut: () => void;
  onOpenCommandCenter: () => void;
  sidebarOpen: boolean;
};

export function StudioHeader({
  title,
  unread,
  noticesOpen,
  onOpenMobileMenu,
  onOpenSearch,
  onToggleNotices,
  user,
  email,
  isSigningOut,
  onSignOut,
  onOpenCommandCenter,
  sidebarOpen,
}: StudioHeaderProps) {
  const initials = (user.name || "Z").slice(0, 2).toUpperCase();
  return (
    <header className="fixed inset-x-0 top-0 z-50 flex h-[56px] items-center gap-3 border-b border-border/80 bg-background px-3 text-foreground backdrop-blur-xl sm:px-4 lg:hidden">
      <div className={`flex min-w-0 shrink-0 items-center gap-2 transition-[width] duration-200 ${sidebarOpen ? "lg:w-[216px]" : "lg:w-16"}`}>
        <Button
          variant="ghost"
          size="icon"
          className="size-9 rounded-xl lg:hidden"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation"
        >
          <IconMenu2 className="size-5" />
        </Button>
        <Link
          href="/"
          aria-label="ZeroCraft home"
          className="hidden items-center gap-2 rounded-xl px-1 py-1 transition-colors hover:bg-muted sm:flex"
        >
          <span className="grid size-8 place-items-center rounded-xl bg-[#111214] shadow-sm">
            <img src="/icon.svg" alt="" className="size-5" />
          </span>
        </Link>
        <div className={`min-w-0 border-l border-border pl-3 ${sidebarOpen ? "" : "lg:hidden"}`}>
          <p className="hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:block">
            Workspace
          </p>
          <p className="truncate text-[15px] font-semibold leading-tight">
            {title}
          </p>
        </div>
      </div>

      <div className="hidden min-w-0 flex-1 items-center justify-center gap-2 md:flex">
        <button
          type="button"
          onClick={onOpenSearch}
          className="flex h-9 min-w-0 w-full max-w-[460px] items-center gap-3 rounded-xl border-0 bg-muted px-3 text-left text-sm text-muted-foreground transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <IconSearch className="size-4 shrink-0" />
          <span className="flex-1 truncate">
            Search works, clients, orders, media…
          </span>
          <kbd className="rounded-md border border-border bg-background px-2 py-1 text-[10px] font-medium">
            Ctrl K
          </kbd>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger
            id="studio-quick-create-trigger"
            render={
              <Button
                variant="ghost"
                size="icon"
                className="size-9 shrink-0 rounded-xl border-0 bg-muted text-foreground shadow-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Quick create"
              >
                <IconPlus className="size-4" />
              </Button>
            }
          />
          <DropdownMenuContent
            align="center"
            className="w-60 rounded-2xl p-1.5"
          >
            <DropdownMenuLabel className="px-2.5 pb-1.5 pt-2">
              Create something new
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="min-h-10 rounded-xl"
              render={<Link href="/quick-create" />}
            >
              Open quick create
            </DropdownMenuItem>
            <DropdownMenuItem
              className="min-h-10 rounded-xl"
              render={<Link href="/works?create=1" />}
            >
              New work
            </DropdownMenuItem>
            <DropdownMenuItem
              className="min-h-10 rounded-xl"
              render={<Link href="/blogs?create=1" />}
            >
              New journal story
            </DropdownMenuItem>
            <DropdownMenuItem
              className="min-h-10 rounded-xl"
              render={<Link href="/appointments?create=1" />}
            >
              New appointment
            </DropdownMenuItem>
            <DropdownMenuItem
              className="min-h-10 rounded-xl"
              render={<Link href="/clients?create=1" />}
            >
              Add client
            </DropdownMenuItem>
            <DropdownMenuItem
              className="min-h-10 rounded-xl"
              render={<Link href="/products/new" />}
            >
              New product
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="size-9 rounded-xl border-0 bg-muted text-foreground shadow-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring md:hidden"
          onClick={onOpenSearch}
          aria-label="Search pages"
        >
          <IconSearch className="size-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-9 rounded-xl border-0 bg-muted text-foreground shadow-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
          onClick={onOpenCommandCenter}
          aria-label="Open studio command center"
        >
          <IconSparkles className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-9 rounded-xl border-0 bg-muted text-foreground shadow-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
          onClick={onToggleNotices}
          aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
          aria-expanded={noticesOpen}
        >
          <IconBell className="size-5" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-primary ring-2 ring-background" />
          )}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            id="studio-profile-trigger"
            render={
              <Button
                variant="ghost"
                size="icon"
                className="size-9 border-0 bg-muted p-0 text-foreground shadow-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Open ${user.name} profile menu`}
              >
                <span className="grid size-full place-items-center bg-transparent text-[10px] font-semibold text-foreground">
                  {initials}
                </span>
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-64 rounded-2xl p-1.5">
            <DropdownMenuLabel className="px-2.5 py-2">
              <span className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-xl bg-foreground text-xs font-semibold text-background">
                  {initials}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-foreground">
                    {user.name}
                  </span>
                  <span className="block truncate text-xs font-normal text-muted-foreground">
                    {email}
                  </span>
                </span>
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="min-h-10 rounded-xl"
              render={<Link href="/settings" />}
            >
              <IconSettings className="size-4" /> Settings
            </DropdownMenuItem>
            <DropdownMenuItem
              className="min-h-10 rounded-xl"
              render={
                <a href="mailto:hello@zerocraft.in?subject=CMS%20support" />
              }
            >
              <IconHelpCircle className="size-4" /> Help &amp; support
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              disabled={isSigningOut}
              className="min-h-10 rounded-xl"
              onClick={onSignOut}
            >
              <IconLogout className="size-4" />{" "}
              {isSigningOut ? "Logging out…" : "Log out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
