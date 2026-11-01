"use client";

import { useMemo, useState } from "react";
import { IconBell, IconCheck, IconFilter, IconInfoCircle, IconPackage, IconX } from "@tabler/icons-react";
import { Popover, PopoverContent, PopoverTrigger } from "@zerocraft/components/ui/popover";
import { ScrollArea } from "@zerocraft/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { CommerceNotification } from "@/lib/supabase-client";

type Props = {
  notices: CommerceNotification[];
  unread: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRead: (item: CommerceNotification) => void;
  onMarkAllRead: () => void;
  onRefresh: () => void;
  onClearRead: () => void;
  loading?: boolean;
  collapsed?: boolean;
};

function iconFor(category: string) {
  if (["orders", "inventory", "products"].includes(category)) return IconPackage;
  return IconInfoCircle;
}

function relativeTime(value: string) {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function NotificationFeed({ notices, unread, open, onOpenChange, onRead, onMarkAllRead, onRefresh, onClearRead, loading, collapsed }: Props) {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const visible = useMemo(() => unreadOnly ? notices.filter((item) => !item.read) : notices, [notices, unreadOnly]);
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger
        aria-label="Alerts"
        title="Alerts"
        className={cn("relative grid size-8 shrink-0 place-items-center rounded-xl text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground", collapsed && "mx-auto")}
      >
        <IconBell className="size-4" />
        {unread > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-destructive px-1 text-center text-[10px] font-semibold leading-4 text-destructive-foreground">{unread > 99 ? "99+" : unread}</span>}
      </PopoverTrigger>
      <PopoverContent side="right" align="end" sideOffset={12} className="w-[min(380px,calc(100vw-24px))] overflow-hidden rounded-2xl p-0 shadow-2xl">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <div className="flex-1"><h2 className="text-sm font-semibold">Alerts</h2><p className="text-[11px] text-muted-foreground">Updates from your workspace</p></div>
          <button type="button" aria-label="Toggle unread alerts" title="Filter alerts" onClick={() => setUnreadOnly((value) => !value)} className={cn("grid size-8 place-items-center rounded-lg hover:bg-muted", unreadOnly && "bg-muted text-foreground")}><IconFilter className="size-4" /></button>
          <button type="button" aria-label="Close alerts" onClick={() => onOpenChange(false)} className="grid size-8 place-items-center rounded-lg hover:bg-muted"><IconX className="size-4" /></button>
        </div>
        <div className="flex items-center justify-between border-b px-4 py-2 text-xs">
          <button type="button" onClick={() => setUnreadOnly((value) => !value)} className="text-muted-foreground hover:text-foreground">{unreadOnly ? "Showing unread" : `${unread} unread`}</button>
          <button type="button" disabled={!unread || loading} onClick={onMarkAllRead} className="inline-flex items-center gap-1.5 font-medium text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"><IconCheck className="size-3.5" /> Mark all as read</button>
        </div>
        <ScrollArea className="h-[min(430px,calc(100vh-190px))] min-h-0">
          <div className="p-2 pr-3">
            {visible.length ? visible.map((item) => { const Icon = iconFor(item.category); return <button key={item.id} type="button" onClick={() => onRead(item)} className={cn("flex w-full gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-muted", !item.read && "bg-muted/60") }>
              <span className={cn("mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground", item.type === "error" && "text-destructive", item.type === "warning" && "text-amber-600")}><Icon className="size-4" /></span>
              <span className="min-w-0 flex-1"><span className="flex items-start gap-2"><span className={cn("min-w-0 flex-1 text-xs font-medium", !item.read && "font-semibold")}>{item.title}</span>{!item.read && <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />}</span><span className="mt-1 block line-clamp-2 text-[11px] leading-4 text-muted-foreground">{item.message}</span><span className="mt-1.5 block text-[10px] text-muted-foreground">{item.category} · {relativeTime(item.created_at)}</span></span>
            </button>; }) : <div className="px-4 py-10 text-center text-xs text-muted-foreground">{unreadOnly ? "No unread alerts" : "No more alerts"}</div>}
          </div>
        </ScrollArea>
        <div className="flex items-center justify-between border-t px-4 py-2 text-[10px] text-muted-foreground"><span>{loading ? "Updating alerts…" : "Alerts update automatically"}</span><span className="flex items-center gap-3"><button type="button" onClick={onClearRead} disabled={!notices.some((item) => item.read) || loading} className="font-medium hover:text-foreground disabled:opacity-40">Clear read</button><button type="button" onClick={onRefresh} className="font-medium hover:text-foreground">Refresh</button></span></div>
      </PopoverContent>
    </Popover>
  );
}
