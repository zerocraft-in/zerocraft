"use client";

import * as React from "react";
import { Search } from "lucide-react";

import { Label } from "@zerocraft/ui/label";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarInput,
} from "@zerocraft/ui/sidebar";

export function SearchForm({ ...props }: React.ComponentProps<"form">) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key && event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <form {...props}>
      <SidebarGroup className="px-0 py-0">
        <SidebarGroupContent className="relative">
          <div className="group-data-[collapsible=icon]:hidden">
            <Label htmlFor="search" className="sr-only">
              Search
            </Label>
            <SidebarInput
              ref={inputRef}
              id="search"
              placeholder="Search"
              className="h-7 rounded-lg border-sidebar-border bg-sidebar-hover pl-8 pr-12 text-[13px] text-sidebar-foreground placeholder:text-sidebar-muted focus-visible:border-sidebar-muted focus-visible:ring-sidebar-ring"
            />
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-sidebar-muted select-none" />
            <kbd className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 font-sans text-[12px] text-sidebar-muted">
              Ctrl K
            </kbd>
          </div>
          <button
            type="button"
            aria-label="Search"
            className="hidden size-7 items-center justify-center rounded-lg text-sidebar-foreground transition-colors hover:bg-sidebar-hover hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring group-data-[collapsible=icon]:flex"
          >
            <Search className="size-4" aria-hidden="true" />
          </button>
        </SidebarGroupContent>
      </SidebarGroup>
    </form>
  );
}
