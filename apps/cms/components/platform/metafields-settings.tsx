"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  IconChevronRight,
  IconDatabase,
  IconInfoCircle,
  IconLayersIntersect,
  IconSearch,
  IconTag,
} from "@tabler/icons-react";
import { Input } from "@zerocraft/components/ui/input";
import type { ContentRecord } from "@/lib/content-model";
import { scopedPath } from "@/lib/platform/scope";

type Payload = { records?: ContentRecord[]; error?: string };

export function MetafieldsSettings({ pathname }: { pathname: string }) {
  const [definitions, setDefinitions] = useState<ContentRecord[]>([]);
  const [entries, setEntries] = useState<ContentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([
      fetch("/api/store/content/definitions", { cache: "no-store", signal: controller.signal }),
      fetch("/api/store/content/entries", { cache: "no-store", signal: controller.signal }),
    ])
      .then(async ([definitionsResponse, entriesResponse]) => {
        const [definitionsPayload, entriesPayload] = await Promise.all([
          definitionsResponse.json() as Promise<Payload>,
          entriesResponse.json() as Promise<Payload>,
        ]);
        if (!definitionsResponse.ok) throw new Error(definitionsPayload.error || "Metaobject definitions could not be loaded.");
        if (!entriesResponse.ok) throw new Error(entriesPayload.error || "Metaobject entries could not be loaded.");
        setDefinitions(definitionsPayload.records || []);
        setEntries(entriesPayload.records || []);
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Custom data could not be loaded.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const filteredDefinitions = useMemo(
    () => definitions.filter((item) => item.title.toLowerCase().includes(search.trim().toLowerCase()) || item.handle.toLowerCase().includes(search.trim().toLowerCase())),
    [definitions, search],
  );
  const definitionsHref = scopedPath("/store/content/metaobjects", pathname);

  return (
    <main className="mx-auto w-full max-w-[800px] space-y-7 pb-20">
      <h1 className="text-2xl font-medium tracking-tight">Metafields and metaobjects</h1>

      <section className="space-y-2.5">
        <div>
          <h2 className="flex items-center gap-1.5 text-sm font-medium tracking-tight">Custom data definitions <IconInfoCircle className="size-3.5 text-muted-foreground" /></h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">Create structured data that can be reused across your store content.</p>
        </div>
        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="flex min-h-[52px] items-center gap-3 border-b px-4 py-3">
            <IconDatabase className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 text-xs font-medium">Metaobject definitions</span>
            <span className="tabular-nums text-xs text-muted-foreground">{loading ? "…" : definitions.length}</span>
            <IconChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </div>
          <div className="flex min-h-[52px] items-center gap-3 border-b px-4 py-3">
            <IconLayersIntersect className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 text-xs font-medium">Metaobject entries</span>
            <span className="tabular-nums text-xs text-muted-foreground">{loading ? "…" : entries.length}</span>
            <IconChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </div>
          <div className="flex min-h-[52px] items-center gap-3 px-4 py-3">
            <IconTag className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 text-xs font-medium">Supported field types</span>
            <span className="text-right text-[11px] text-muted-foreground">Text · Number · Boolean</span>
          </div>
        </div>
        <div className="flex items-start gap-2 rounded-xl border border-sky-500/20 bg-sky-500/10 p-3 text-sky-950 dark:text-sky-100">
          <IconInfoCircle className="mt-0.5 size-4 shrink-0" />
          <p className="text-[11px] leading-5">Per-resource metafield definitions for products, customers, and orders are not available yet. Metaobject definitions and entries are managed here.</p>
        </div>
      </section>

      <section className="space-y-2.5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium tracking-tight">Metaobject definitions</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Define reusable multi-field records for custom store content.</p>
          </div>
          <Link href={definitionsHref} className="inline-flex h-7 items-center rounded-full bg-muted px-3 text-[11px] font-medium transition hover:bg-muted/70">Manage definitions</Link>
        </div>
        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="flex items-center gap-2 border-b p-2.5">
            <IconSearch className="ml-1 size-4 shrink-0 text-muted-foreground" />
            <Input aria-label="Search metaobject definitions" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search definitions" className="h-8 border-0 bg-transparent shadow-none focus-visible:ring-0" />
            <Link href={definitionsHref} className="inline-flex h-8 shrink-0 items-center rounded-lg bg-foreground px-3 text-[11px] font-medium text-background transition hover:opacity-90">Add definition</Link>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_100px_64px] gap-3 bg-muted/40 px-4 py-2.5 text-[10px] font-medium text-muted-foreground sm:grid-cols-[minmax(0,1fr)_140px_72px]">
            <span>Definition name</span><span>Added by</span><span className="text-right">Entries</span>
          </div>
          {loading ? (
            <p className="px-4 py-6 text-xs text-muted-foreground">Loading definitions…</p>
          ) : error ? (
            <p role="alert" className="px-4 py-6 text-xs text-destructive">{error}</p>
          ) : filteredDefinitions.length ? (
            filteredDefinitions.map((definition) => (
              <Link key={definition.id} href={definitionsHref} className="grid grid-cols-[minmax(0,1fr)_100px_64px] items-center gap-3 border-t px-4 py-3 text-xs transition hover:bg-muted/30 sm:grid-cols-[minmax(0,1fr)_140px_72px]">
                <span className="min-w-0 truncate font-medium">{definition.title}<span className="ml-2 font-normal text-muted-foreground">{definition.handle}</span></span>
                <span className="truncate text-muted-foreground">Store</span>
                <span className="text-right tabular-nums">{entries.filter((entry) => entry.parent_id === definition.id).length}</span>
              </Link>
            ))
          ) : (
            <div className="px-4 py-8 text-center">
              <p className="text-xs font-medium">{search ? "No matching definitions" : "No metaobject definitions yet"}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{search ? "Try another name or handle." : "Create a definition to start structuring custom store data."}</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
