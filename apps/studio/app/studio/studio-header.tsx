"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, CalendarDays, FileText, FolderKanban, LayoutDashboard, SearchIcon, Settings2, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@zerocraft/ui/components/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@zerocraft/ui/components/input-group";
import { Kbd } from "@zerocraft/ui/components/kbd";
import { Popover, PopoverContent, PopoverTrigger } from "@zerocraft/ui/components/popover";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList, CommandShortcut } from "@zerocraft/ui/components/command";
import { AccountMenu } from "./account-menu";

const searchItems = [
  { title: "Overview", description: "Workspace dashboard", href: "/studio", icon: LayoutDashboard },
  { title: "Projects", description: "Active work and project health", href: "/studio/projects", icon: FolderKanban },
  { title: "Pipeline", description: "Inquiries and lead stages", href: "/studio/inquiries", icon: Users },
  { title: "Media library", description: "Assets stored in Cloudflare R2", href: "/studio/media", icon: FileText },
  { title: "Content", description: "Editorial workspace", href: "/studio/content", icon: FileText },
  { title: "Settings", description: "Workspace configuration", href: "/studio/settings", icon: Settings2 },
];

export function StudioHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const searchRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => searchRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const results = searchItems.filter((item) => `${item.title} ${item.description}`.toLowerCase().includes(query.toLowerCase().trim()));
  const currentPage = searchItems.find((item) => item.href === pathname)?.title ?? "Studio";
  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }
  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && results[0]) {
      event.preventDefault();
      go(results[0].href);
    }
  }

  return (
    <header className="flex flex-wrap items-center gap-3 pt-5">
      <Link href="/studio" className="text-[15px] text-zinc-400 hover:text-white">ZeroCraft Studio <span className="text-zinc-700">/</span> <span className="text-white">{currentPage}</span></Link>
      <div className="flex-1" />
      <Popover modal={false} open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (!nextOpen) setQuery(""); }} onOpenChangeComplete={(nextOpen) => { if (nextOpen) searchRef.current?.focus(); }}>
        <PopoverTrigger nativeButton={false} render={<div aria-label="Search workspace" className="w-full max-w-[260px]" />}>
          <InputGroup className="h-11 *:items-center justify-between rounded-full border border-white/[.14] bg-white/[.06] px-1 text-sm backdrop-blur-2xl sm:flex">
            <InputGroupInput ref={searchRef} value={query} onChange={(event) => { const nextQuery = event.target.value; setQuery(nextQuery); setOpen(Boolean(nextQuery.trim())); }} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()} onKeyDown={handleSearchKeyDown} placeholder="Search workspace" aria-label="Search workspace" />
            <InputGroupAddon align="inline-end"><Kbd className="rounded-md!">Ctrl K</Kbd></InputGroupAddon>
          </InputGroup>
        </PopoverTrigger>
        <PopoverContent align="end" sideOffset={10} className="w-[min(400px,calc(100vw-32px))] overflow-hidden rounded-[24px] border-white/[.14] bg-[#17171a]/95 p-1.5 text-white shadow-[0_24px_80px_rgba(0,0,0,.55)] backdrop-blur-2xl">
          <Command shouldFilter={false} className="bg-transparent">
            <CommandList className="max-h-80 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {query.trim() && results.length === 0 && <CommandEmpty className="py-10 text-zinc-400"><SearchIcon className="mx-auto mb-2 size-5 opacity-60" />No matching workspace results.</CommandEmpty>}
              <AnimatePresence initial={false}>
                {results.length > 0 && <motion.div key="search-results" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.16, ease: "easeOut" }}>
                  <CommandGroup className="px-1.5 py-2" heading="Search results">{results.map((item) => { const Icon = item.icon; return <CommandItem key={item.href} value={item.title} onSelect={() => go(item.href)} className="mb-1 min-h-14 rounded-xl px-3 py-2.5 last:mb-0"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/[.07] text-zinc-300"><Icon className="size-4" /></span><span className="min-w-0 flex-1"><span className="block font-medium">{item.title}</span><span className="block truncate text-xs text-zinc-500">{item.description}</span></span><CommandShortcut>Enter</CommandShortcut></CommandItem>; })}</CommandGroup>
                </motion.div>}
              </AnimatePresence>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <Button className="h-11 rounded-full px-5"><span className="text-lg leading-none">+</span> New</Button>
      <AccountMenu />
      <Button variant="ghost" size="icon-sm" className="text-zinc-500 sm:hidden" aria-label="Open calendar"><CalendarDays /></Button>
      <Button variant="ghost" size="icon-sm" className="text-zinc-500 sm:hidden" aria-label="Notifications"><Bell /></Button>
    </header>
  );
}
