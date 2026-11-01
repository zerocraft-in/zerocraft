"use client";

import { useEffect, useState } from "react";
import {
  IconChevronRight,
  IconExternalLink,
  IconGlobe,
  IconInfoCircle,
  IconLock,
} from "@tabler/icons-react";

type StoreRecord = { slug: string; name: string; published_at?: string | null };

const cardClass = "overflow-hidden rounded-2xl border bg-card shadow-sm";

export function DomainsSettings({ pathname }: { pathname: string }) {
  const slug = pathname.match(/^\/store\/([^/]+)/)?.[1] || "";
  const [store, setStore] = useState<StoreRecord | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/platform/stores", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error("Store details could not be loaded.");
        setStore((payload.stores as StoreRecord[] | undefined)?.find((item) => item.slug === slug) || null);
        setLoadState("ready");
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoadState("error");
      });
    return () => controller.abort();
  }, [slug]);

  return (
    <main className="mx-auto w-full max-w-[800px] pb-20">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-medium tracking-tight">Domains</h1>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled title="Domain connection is not available yet" className="h-8 rounded-full border bg-card px-3 text-[11px] font-medium text-muted-foreground opacity-60">Connect existing</button>
          <button type="button" disabled title="Domain transfer is not available yet" className="h-8 rounded-full border bg-card px-3 text-[11px] font-medium text-muted-foreground opacity-60">Transfer domain</button>
          <button type="button" disabled title="Domain purchasing is not available yet" className="h-8 rounded-full bg-foreground px-3 text-[11px] font-medium text-background opacity-60">Buy new domain</button>
        </div>
      </header>

      <section className={`${cardClass} mb-3 flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5`}>
        <div className="min-w-0">
          <h2 className="text-xs font-semibold">Connect a domain for your store</h2>
          <p className="mt-1 max-w-[560px] text-xs leading-5 text-muted-foreground">Use a domain you own to give customers a branded storefront address. Domain registration, DNS verification, and SSL provisioning are not connected to this CMS yet.</p>
          <button type="button" disabled title="Domain management is not available yet" className="mt-3 inline-flex h-7 items-center rounded-full bg-muted px-3 text-[11px] font-medium text-muted-foreground">Domain setup unavailable</button>
        </div>
        <div aria-hidden="true" className="grid size-16 shrink-0 place-items-center self-end rounded-2xl bg-sky-500/10 text-sky-700 sm:size-[72px] sm:self-auto"><IconGlobe className="size-8" stroke={1.4} /></div>
      </section>

      <section className={`${cardClass} mb-3`}>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 bg-muted/40 px-4 py-2.5 text-[10px] font-medium text-muted-foreground sm:px-5"><span>Domain</span><span>Status</span></div>
        <div className="flex min-h-[58px] items-center gap-3 px-4 py-3 sm:px-5">
          <IconGlobe className="size-4 shrink-0 text-muted-foreground" stroke={1.7} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">{loadState === "loading" ? "Loading store address…" : store ? `${store.slug} · CMS store` : loadState === "error" ? "Store address unavailable" : "No store address configured"}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{store ? "Internal store route; this is not a customer-facing domain." : "No public domain record is connected to this store."}</p>
          </div>
          <span className="shrink-0 rounded-md bg-muted px-2 py-1 text-[10px] text-muted-foreground">{store ? "Admin route" : "Not connected"}</span>
        </div>
      </section>

      <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-amber-950 dark:text-amber-100">
        <IconInfoCircle className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-300" />
        <p className="text-[11px] leading-5">No custom domain, DNS verification, or SSL status is stored for this shop. Connect a domain through your DNS provider only after domain management is enabled here.</p>
      </div>
      <div className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground"><IconLock className="size-3.5 shrink-0" />Domain security and SSL status will be shown after a domain connection is configured.<IconChevronRight className="ml-auto size-4 shrink-0" /></div>
      {store?.published_at && <p className="mt-3 text-[11px] text-muted-foreground">Storefront published. A custom domain can be connected when domain management is available.</p>}
      <a href="https://www.cloudflare.com/learning/dns/what-is-dns/" target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Learn about domains and DNS<IconExternalLink className="size-3" /></a>
    </main>
  );
}
