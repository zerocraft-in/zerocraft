"use client";

import { useEffect, useMemo, useState } from "react";
import { IconCopy, IconDownload, IconPhoto, IconRefresh, IconSearch } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SelectField } from "@/components/ui/select-field";

type Asset = { path: string; name: string; folder: string; url: string; mimeType: string; size: number; createdAt: string | null; updatedAt: string | null };

function formatSize(bytes: number) {
  if (!bytes) return "Unknown size";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MediaLibraryPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [query, setQuery] = useState("");
  const [folder, setFolder] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/studio/store/media-library", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Media library could not be loaded.");
      setAssets(payload.assets || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Media library could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const folders = useMemo(() => ["all", ...new Set(assets.map((asset) => asset.folder))], [assets]);
  const visible = useMemo(() => assets.filter((asset) => {
    const matchesQuery = `${asset.name} ${asset.path}`.toLowerCase().includes(query.trim().toLowerCase());
    return matchesQuery && (folder === "all" || asset.folder === folder);
  }), [assets, folder, query]);

  async function copyUrl(asset: Asset) {
    await navigator.clipboard?.writeText(asset.url);
    setCopied(asset.path);
    window.setTimeout(() => setCopied(""), 1600);
  }

  return <main className="mx-auto w-full max-w-screen-2xl space-y-6 pb-12">
    <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Catalog</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Media library</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Browse reusable Supabase Storage assets and select them across products and categories.</p></div>
      <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}><IconRefresh className={loading ? "animate-spin" : ""} /> Refresh</Button>
    </header>
    {error && <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
    <Card className="border-border shadow-none"><CardHeader className="gap-4 border-b sm:flex-row sm:items-center sm:justify-between"><div><CardTitle className="text-lg">Storage assets</CardTitle><CardDescription>{loading ? "Loading assets…" : `${visible.length} of ${assets.length} assets`}</CardDescription></div><div className="flex flex-col gap-2 sm:flex-row"><label className="flex h-9 min-w-60 items-center gap-2 rounded-lg border border-input px-3 text-sm text-muted-foreground"><IconSearch className="size-4" /><span className="sr-only">Search assets</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search assets" className="min-w-0 flex-1 bg-transparent outline-none" /></label><SelectField value={folder} onValueChange={setFolder} aria-label="Filter by folder" className="min-w-36" options={[{ value: "all", label: "All folders" }, ...folders.slice(1).map((item) => ({ value: item, label: item }))]} /></div></CardHeader><CardContent className="p-4 sm:p-6">{loading ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">{Array.from({ length: 10 }).map((_, index) => <div key={index} className="aspect-square animate-pulse rounded-xl bg-muted" />)}</div> : visible.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">{visible.map((asset) => <article key={asset.path} className="group overflow-hidden rounded-xl border border-border bg-card transition hover:border-foreground/30 hover:shadow-md"><div className="relative aspect-square overflow-hidden bg-muted"><img src={asset.url} alt={asset.name} className="size-full object-cover transition duration-300 group-hover:scale-[1.03]" />{/* eslint-disable-line @next/next/no-img-element */}<div className="absolute inset-x-2 bottom-2 flex justify-end gap-1 opacity-0 transition group-hover:opacity-100"><Button variant="secondary" size="icon-sm" onClick={() => void copyUrl(asset)} aria-label={`Copy URL for ${asset.name}`}><IconCopy className="size-4" /></Button><Button variant="secondary" size="icon-sm" nativeButton={false} render={<a href={asset.url} target="_blank" rel="noreferrer" />} aria-label={`Open ${asset.name}`}><IconDownload className="size-4" /></Button></div></div><div className="space-y-2 p-3"><div className="flex items-start justify-between gap-2"><p className="truncate text-sm font-medium" title={asset.name}>{asset.name}</p><Badge variant="outline" className="shrink-0 text-[10px]">{asset.mimeType.split("/").pop()}</Badge></div><p className="truncate text-xs text-muted-foreground" title={asset.path}>{asset.folder} · {formatSize(asset.size)}</p>{copied === asset.path && <p className="text-xs font-medium text-emerald-600">URL copied</p>}</div></article>)}</div> : <div className="grid min-h-72 place-items-center text-center"><div><IconPhoto className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 text-sm font-medium">No assets found</p><p className="mt-1 text-xs text-muted-foreground">Upload product or category media to make assets reusable here.</p></div></div>}</CardContent></Card>
  </main>;
}
