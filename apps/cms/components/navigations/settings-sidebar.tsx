"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  IconApps,
  IconBell,
  IconCreditCard,
  IconCash,
  IconChartDots,
  IconChevronRight,
  IconCircleKey,
  IconLanguage,
  IconLock,
  IconMapPin,
  IconPackage,
  IconPencil,
  IconReceipt,
  IconSettings,
  IconShoppingCart,
  IconSparkles,
  IconTruck,
  IconUser,
  IconUsers,
  IconWorld,
  IconSearch,
  IconChevronLeft,
} from "@tabler/icons-react";
import { Input } from "@zerocraft/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@zerocraft/components/ui/popover";
import { isAdminRouteActive } from "@/lib/admin-navigation";
import { Button, buttonVariants } from "@zerocraft/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@zerocraft/components/ui/avatar";
import { IconDots } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { scopedPath, unscopedPath } from "@/lib/platform/scope";
const SETTINGS_LINKS = [
  ["General", "general", IconSettings],
  ["Plan", "plan", IconCreditCard],
  ["Billing", "billing", IconReceipt],
  ["Users", "users", IconUsers],
  ["Payments", "payments", IconCash],
  ["Checkout", "checkout", IconShoppingCart],
  ["Customer accounts", "customer-accounts", IconUser],
  ["Shipping and delivery", "shipping", IconTruck],
  ["Taxes and duties", "taxes", IconReceipt],
  ["Locations", "locations", IconMapPin],
  ["Apps", "apps", IconApps],
  ["Sales channels", "sales-channels", IconChartDots],
  ["Domains", "domains", IconWorld],
  ["Customer events", "customer-events", IconSparkles],
  ["Notifications", "notifications", IconBell],
  ["Metafields and metaobjects", "custom-data", IconPackage],
  ["Languages", "languages", IconLanguage],
  ["Customer privacy", "privacy", IconLock],
  ["Policies", "policies", IconCircleKey],
] as const;

export function SettingsSidebar({
  pathname,
  user,
}: {
  pathname: string;
  user?: { name: string; email: string };
}) {
  const routePath = unscopedPath(pathname);
  const [query, setQuery] = useState("");
  const [backLinkHovered, setBackLinkHovered] = useState(false);
  const links = useMemo(
    () =>
      SETTINGS_LINKS.filter(([label]) =>
        label.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [query],
  );
  return (
    <aside
        className="hidden w-[216px] shrink-0 border-l border-[#2b2b2e] bg-[#0b0b0c] px-3 py-3 text-[#f1f1f1] lg:flex lg:flex-col"
      aria-label="Settings navigation"
    >
      <Link
        href={scopedPath("/store", pathname)}
        aria-label="Back to workspace"
        onMouseEnter={() => setBackLinkHovered(true)}
        onMouseLeave={() => setBackLinkHovered(false)}
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "group mb-2 flex items-center justify-start gap-2 rounded-xl p-2",
        )}
      >
        <IconChevronLeft className="size-4 shrink-0" />
        <span className="relative inline-flex h-4 min-w-14 overflow-hidden">
          <motion.span
            className="absolute inset-0"
            animate={{
              opacity: backLinkHovered ? 0 : 1,
              x: backLinkHovered ? -8 : 0,
            }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            Settings
          </motion.span>
          <motion.span
            className="absolute inset-0"
            animate={{
              opacity: backLinkHovered ? 1 : 0,
              x: backLinkHovered ? 0 : 8,
            }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            Back
          </motion.span>
        </span>
      </Link>

      <div className="relative mb-2">
        <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#a7a7ac]" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search settings"
          aria-label="Search settings"
          className="h-8 rounded-xl border-[#454548] bg-[#303033] pl-8 text-[12px] text-[#f1f1f1] placeholder:text-[#a7a7ac]"
        />
      </div>

      <Popover>
        <PopoverTrigger
          render={
            <button
              type="button"
              aria-label="Open My Store actions"
              className="mb-2 flex h-11 w-full items-center gap-2 rounded-xl border border-transparent bg-[#303033] px-2 text-left text-[#f1f1f1] transition-colors hover:border-[#454548] hover:bg-[#38383b]"
            />
          }
        >
          <Avatar className="size-6 rounded-md">
            <AvatarImage src="https://github.com/shadcn.png" className="rounded-md" />
            <AvatarFallback>MS</AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-[12px] font-semibold">My Store</span>
            <span className="block truncate text-[10px] text-[#a7a7ac]">zerocraft.studio</span>
          </span>
          <IconDots className="size-4 shrink-0 text-[#a7a7ac]" />
        </PopoverTrigger>
        <PopoverContent className="w-40 gap-1 rounded-xl border-[#303033] bg-[#1b1b1d] p-1.5" side="right" align="start">
          <Button variant="ghost" size="xs" type="button" className="w-full justify-start text-[#f1f1f1] hover:bg-[#303033]">
            <IconPencil className="size-3.5" />
            Edit store icon
          </Button>
          <Button variant="ghost" size="xs" type="button" className="w-full justify-start text-[#f1f1f1] hover:bg-[#303033]">
            <IconWorld className="size-3.5" />
            Edit domain
          </Button>
        </PopoverContent>
      </Popover>

      <nav
        className="min-h-0 flex-1 space-y-0.5 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Settings sections"
      >
        {links.map(([label, key, Icon]) => {
          const href = key === "general" ? "/settings" : key === "policies" ? "/settings/legal" : `/settings/${key}`;
          const scopedHref = scopedPath(href, pathname);
          const active = key === "policies"
            ? routePath === "/settings/legal" || routePath === "/settings/policies"
            :
            key === "general"
              ? routePath === "/settings"
              : isAdminRouteActive(routePath, href);
          return (
            <div key={key}>
              <Link
                href={scopedHref}
                aria-current={active && key !== "users" ? "page" : undefined}
                className={`flex min-h-7 items-center gap-2 rounded-lg px-2 py-1 text-[12px] transition-colors ${active ? "bg-[#303033] font-semibold text-[#f1f1f1]" : "text-[#d0d0d3] hover:bg-[#242426] hover:text-[#f1f1f1]"}`}
              >
                <Icon className="size-3.5 shrink-0 text-[#a7a7ac]" stroke={1.7} />
                <span className="truncate">{label}</span>
                {active && key !== "users" && <IconChevronRight className="ml-auto size-3.5 shrink-0" />}
              </Link>
              {key === "users" && active && (
                <div className="ml-7 mt-0.5 space-y-0.5 border-l border-[#454548] pl-2">
                  {[
                    ["Users", "/settings/users"],
                    ["Roles", "/settings/users/roles"],
                    ["Security", "/settings/users/security"],
                  ].map(([childLabel, childHref]) => {
                    const childActive = routePath === childHref;
                    return <Link key={childHref} href={scopedPath(childHref, pathname)} aria-current={childActive ? "page" : undefined} className={`block rounded-md px-2 py-1 text-[11px] ${childActive ? "bg-[#303033] font-semibold text-[#f1f1f1]" : "text-[#a7a7ac] hover:bg-[#242426] hover:text-[#f1f1f1]"}`}>{childLabel}</Link>;
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      <div className="mt-3 flex items-center gap-2 border-t border-[#2b2b2e] px-1 pt-3">
        <span className="grid size-7 place-items-center rounded-full bg-[#1dd3c0] text-[10px] font-semibold text-[#06201d]">
          ZS
        </span>
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-[11px] font-semibold">
            {user?.name || "zerocraft studio"}
          </span>
          <span className="block truncate text-[10px] text-[#a7a7ac]">
            {user?.email || "in.zerocraft@gmail.com"}
          </span>
        </span>
      </div>
    </aside>
  );
}
