"use client";
import { useEffect, useState } from "react";
import { IconBuildingStore, IconCheck, IconChevronDown, IconPlus } from "@tabler/icons-react";
import { storeConnections, connectionForHost, type StoreConnection } from "@zerocraft/supabase/config";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@zerocraft/components/ui/dropdown-menu";

export function StoreSwitcher({ collapsed = false }: { collapsed?: boolean }) {
  const [current, setCurrent] = useState<StoreConnection | null>(null);
  const stores = storeConnections();
  useEffect(() => { setCurrent(connectionForHost(window.location.host)); }, []);
  const name = current?.name || process.env.NEXT_PUBLIC_STORE_NAME || "Zerocraft store";
  return <DropdownMenu><DropdownMenuTrigger render={<button type="button" aria-label={`Switch store: ${name}`} title={name} className={`flex h-9 items-center gap-2 rounded-lg px-2 text-left text-sidebar-foreground hover:bg-sidebar-accent ${collapsed ? "mx-auto w-9 justify-center" : "w-full"}`} />}><IconBuildingStore className="size-4 shrink-0" />{!collapsed && <><span className="min-w-0 flex-1 truncate text-xs font-semibold">{name}</span><IconChevronDown className="size-3" /></>}</DropdownMenuTrigger><DropdownMenuContent align="start" className="w-64"><StoreMenuItems currentId={current?.id} currentName={name} stores={stores} /></DropdownMenuContent></DropdownMenu>;
}

export function StoreMenuItems({ currentId, currentName, stores = storeConnections() }: { currentId?: string; currentName?: string; stores?: StoreConnection[] }) {
  const fallbackName = currentName || "Zerocraft store";
  return <>
    <DropdownMenuLabel className="px-2.5 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Switch store</DropdownMenuLabel>
    {stores.length ? stores.map(store => <DropdownMenuItem key={store.id} className="min-h-9 gap-2 rounded-lg" onClick={() => { if (store.id !== currentId) { const target = new URL(store.adminOrigin); const sameOrigin = target.origin === window.location.origin; window.location.assign(sameOrigin ? "/stores" : new URL("/store", target).href); } }}>
      <IconBuildingStore className="size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate">{store.name}</span>
      {store.id === currentId && <IconCheck className="size-4 shrink-0 text-primary" />}
    </DropdownMenuItem>) : <DropdownMenuItem disabled className="min-h-9 gap-2 rounded-lg"><IconBuildingStore className="size-4" /><span className="truncate">{fallbackName}</span></DropdownMenuItem>}
    <DropdownMenuSeparator className="my-1" />
    <DropdownMenuItem className="min-h-9 gap-2 rounded-lg font-medium" onClick={() => window.location.assign("/stores/new")}>
      <IconPlus className="size-4" /><span>Create store</span>
    </DropdownMenuItem>
  </>;
}
