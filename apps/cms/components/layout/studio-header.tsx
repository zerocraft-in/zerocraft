"use client";

import Link from "next/link";
import {
  IconBell,
  IconMenu2,
  IconPlus,
  IconSearch,
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
  sidebarCollapsed: boolean;
  unread: number;
  noticesOpen: boolean;
  onOpenMobileMenu: () => void;
  onOpenSearch: () => void;
  onToggleNotices: () => void;
};

export function StudioHeader({
  title,
  sidebarCollapsed,
  unread,
  noticesOpen,
  onOpenMobileMenu,
  onOpenSearch,
  onToggleNotices,
}: StudioHeaderProps) {
  return (
    <header className={`fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between gap-4 border-b border-border bg-background px-4 text-foreground transition-[left] duration-200 sm:px-6 ${sidebarCollapsed ? "lg:left-[72px]" : "lg:left-[280px]"}`}>
      <div className="flex min-w-0 items-center gap-2">
        <Button variant="ghost" size="icon" className="size-11 rounded-lg lg:hidden" onClick={onOpenMobileMenu} aria-label="Open navigation">
          <IconMenu2 className="size-5" />
        </Button>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">ZeroCraft CMS</p>
          <p className="truncate text-base font-semibold leading-tight">{title}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button className="hidden rounded-full px-4 sm:inline-flex">
                <IconPlus className="size-4" />
                Create
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>Quick create</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/works?create=1" />}>
              New work
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/blogs?create=1" />}>
              New journal story
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/appointments?create=1" />}>
              New appointment
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/clients" />}>
              Add client
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/products/new" />}>
              New product
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="ghost" size="icon" className="size-11 rounded-lg" onClick={onOpenSearch} aria-label="Search pages">
          <IconSearch className="size-5" />
        </Button>
        <Button variant="ghost" size="icon" className="relative size-11 rounded-lg" onClick={onToggleNotices} aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} aria-expanded={noticesOpen}>
          <IconBell className="size-5" />
          {unread > 0 && <span className="absolute right-1 top-1 size-2 rounded-full bg-primary" />}
        </Button>
      </div>
    </header>
  );
}
