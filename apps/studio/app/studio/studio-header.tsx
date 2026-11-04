"use client";

import { Bell, CalendarDays, SearchIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar, AvatarFallback } from "@zerocraft/ui/components/avatar";
import { Button } from "@zerocraft/ui/components/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from "@zerocraft/ui/components/input-group";
import { Kbd } from "@zerocraft/ui/components/kbd";
export function StudioHeader() {
  const pathname = usePathname();
  if (pathname !== "/studio") return null;

  return (
    <header className="flex flex-wrap items-center gap-3 pt-5">
      <Link
        href="/studio"
        className="text-[15px] text-zinc-400 hover:text-white"
      >
        ZeroCraft Studio <span className="text-zinc-700">/</span>{" "}
        <span className="text-white">Overview</span>
      </Link>
      <div className="flex-1" />
      {/* <div className="hidden h-11 min-w-[260px] items-center justify-between rounded-full border border-white/[.14] bg-white/[.06] px-[18px] text-sm backdrop-blur-2xl sm:flex">
        <span className="text-zinc-500">Search workspace</span>
        <kbd className="font-mono text-[13px] text-zinc-500">⌘K</kbd>
      </div> */}

      <InputGroup className="h-11 max-w-[260px] *:items-center justify-between rounded-full border border-white/[.14] bg-white/[.06] px-1 text-sm backdrop-blur-2xl sm:flex">
        <InputGroupInput placeholder="Search workspace" />
        <InputGroupAddon align="inline-end">
          <Kbd className="rounded-md!">⌘K</Kbd>
        </InputGroupAddon>
      </InputGroup>

      <Button className="h-11 rounded-full px-5">
        <span className="text-lg leading-none">+</span> New
      </Button>
      <Avatar size="lg" className="border border-white/20 bg-[#2a2a2e]">
        <AvatarFallback>ZC</AvatarFallback>
      </Avatar>
      <Button
        variant="ghost"
        size="icon-sm"
        className="text-zinc-500 sm:hidden"
        aria-label="Open calendar"
      >
        <CalendarDays />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className="text-zinc-500 sm:hidden"
        aria-label="Notifications"
      >
        <Bell />
      </Button>
    </header>
  );
}
