"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Code2,
  DiagramFlowHorizontal,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Store,
  X,
} from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { Button } from "@zerocraft/ui/button";
import { Card, CardContent, CardTitle } from "@zerocraft/ui/card";
import { Input } from "@zerocraft/ui/input";

type Channel = { id: string; key: string; name: string; provider_key: string | null };
const icons = {
  maara: Store,
  meta: ShoppingBag,
  amazon: ShoppingBag,
};

export function PublishingCard({
  productId,
  onSelectionChange,
  onDirtyChange,
}: {
  productId?: string;
  onSelectionChange?: (keys: string[]) => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const onDirtyChangeRef = useRef(onDirtyChange);
  useEffect(() => {
    onDirtyChangeRef.current = onDirtyChange;
  }, [onDirtyChange]);
  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data: membership } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", userData.user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      if (!membership) return;
      const { data: installations } = await supabase
        .schema("sales_channels")
        .from("channel_installations")
        .select("channel_id")
        .eq("organization_id", membership.organization_id)
        .in("status", ["active", "paused"]);
      const ids = (installations ?? []).map((row) => row.channel_id);
      const { data: rows } = await supabase
        .schema("sales_channels")
        .from("channels")
        .select("id,key,name,provider_key")
        .in("id", ids)
        .order("name");
      const available = (rows ?? []) as Channel[];
      let next = available.map((channel) => channel.key);
      // Note: product_publications table does not exist yet.
      // Publishing status is tracked in sales_channels.product_listings.
      // Published channels cannot be determined until that table is populated.
      if (productId) {
        next = available.map((channel) => channel.key);
      }
      if (active) {
        setChannels(available);
        setSelected(next);
        onSelectionChange?.(next);
        onDirtyChangeRef.current?.(false);
        setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [onSelectionChange, productId, supabase]);
  const change = (key: string, checked: boolean) => {
    const next = checked
      ? [...new Set([...selected, key])]
      : selected.filter((item) => item !== key);
    setSelected(next);
    onSelectionChange?.(next);
    onDirtyChange?.(true);
  };
  const visible = channels.filter((channel) =>
    channel.name.toLowerCase().includes(query.toLowerCase()),
  );
  const allSelected =
    channels.length > 0 && selected.length === channels.length;
  return (
    <>
      <Card className="border-0 bg-transparent shadow-none">
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm font-semibold">Publishing</CardTitle>
          <button
            type="button"
            aria-label="Manage publishing"
            title="Manage publishing"
            onClick={() => setOpen(true)}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <SlidersHorizontal className="size-4" />
          </button>
        </div>
        <CardContent className="px-0 pb-5 border-b">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex w-full items-center gap-2 rounded-md py-1 text-left text-sm hover:bg-muted/60"
          >
            <span className="text-muted-foreground pl-2">
              <DiagramFlowHorizontal className="size-4"/>
            </span>
            <span>
              {loading
                ? "Loading channels…"
                : allSelected
                  ? "All channels"
                  : `${selected.length} channel${selected.length === 1 ? "" : "s"}`}
            </span>
          </button>
        </CardContent>
      </Card>
      {open && (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="publishing-title"
            className="flex max-h-[min(720px,90vh)] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-background shadow-2xl"
          >
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2 id="publishing-title" className="font-semibold">
                Manage publishing
              </h2>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="rounded-full p-2 hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="grid min-h-[380px] grid-cols-[190px_1fr]">
              <div className="border-r bg-muted/20 p-3">
                <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm font-medium">
                  <span>Sales Channels</span>
                  <span className="rounded bg-background px-1.5 py-0.5 text-xs">
                    {channels.length}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between px-3 py-2 text-sm">
                  <span>Agentic</span>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-xs">
                    {
                      channels.filter(
                        (channel) => channel.provider_key === "agentic",
                      ).length
                    }
                  </span>
                </div>
              </div>
              <div className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    aria-label="Search channels"
                    placeholder="Search channels"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="mt-4 overflow-hidden rounded-lg border">
                  <label className="flex items-center justify-between border-b bg-muted/30 px-3 py-3 text-sm font-medium">
                    <span>Sales Channels</span>
                    <input
                      type="checkbox"
                      aria-label="Unpublish from all"
                      checked={selected.length === 0}
                      onChange={(event) => {
                        if (event.target.checked) {
                          setSelected([]);
                          onSelectionChange?.([]);
                        }
                      }}
                    />
                  </label>
                  {visible.map((channel) => {
                    const Icon =
                      icons[channel.key as keyof typeof icons] ?? Store;
                    return (
                      <label
                        key={channel.id}
                        className="flex items-center justify-between border-b last:border-b-0 px-3 py-3 text-sm"
                      >
                        <span className="flex items-center gap-2">
                          <Icon className="size-4 text-muted-foreground" />
                          {channel.name}
                        </span>
                        <input
                          type="checkbox"
                          checked={selected.includes(channel.key)}
                          onChange={(event) =>
                            change(channel.key, event.target.checked)
                          }
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t px-5 py-4">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setOpen(false)}>Done</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
