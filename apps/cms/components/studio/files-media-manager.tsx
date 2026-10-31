"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  IconAlertCircle,
  IconCheck,
  IconChevronDown,
  IconClipboard,
  IconCloudUpload,
  IconDots,
  IconExternalLink,
  IconFile,
  IconFilter,
  IconGrid3x3,
  IconLink,
  IconList,
  IconLoader2,
  IconPackage,
  IconPhoto,
  IconPencil,
  IconRefresh,
  IconSearch,
  IconTrash,
  IconUpload,
  IconX,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "cn";

type Product = { id: string; title: string; slug: string; status: string };
type Reference = { id: string; type: "product" | "category" | "subcategory"; productId: string | null; label: string; slug: string; isPrimary: boolean };
type Asset = { path: string; url: string; name: string; fileName: string; folder: string; mimeType: string; size: number; createdAt: string | null; updatedAt: string | null; altText: string; referenced: boolean; references: Reference[] };

function formatBytes(value: number) {
  if (!value) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
}

function formatDate(value: string | null) {
  if (!value) return "Unknown date";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value));
}

function isImage(asset: Asset) { return asset.mimeType.startsWith("image/"); }

export function FilesMediaManager() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [folder, setFolder] = useState("all");
  const [referenceFilter, setReferenceFilter] = useState("all");
  const [selectedUploadProduct, setSelectedUploadProduct] = useState("none");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<Asset | null>(null);
  const [altText, setAltText] = useState("");
  const [linkProduct, setLinkProduct] = useState("none");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/store/media-library", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Media library could not be loaded.");
      setAssets(payload.assets || []);
      setProducts(payload.products || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Media library could not be loaded.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const folders = useMemo(() => ["all", ...Array.from(new Set(assets.map((asset) => asset.folder).filter(Boolean)))], [assets]);
  const filtered = useMemo(() => assets.filter((asset) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || `${asset.fileName} ${asset.folder} ${asset.altText} ${asset.references.map((reference) => reference.label).join(" ")}`.toLowerCase().includes(query);
    const matchesFolder = folder === "all" || asset.folder === folder;
    const matchesReference = referenceFilter === "all" || (referenceFilter === "referenced" ? asset.referenced : !asset.referenced);
    return matchesSearch && matchesFolder && matchesReference;
  }), [assets, folder, referenceFilter, search]);

  const stats = useMemo(() => ({ total: assets.length, referenced: assets.filter((asset) => asset.referenced).length, unreferenced: assets.filter((asset) => !asset.referenced).length, size: assets.reduce((sum, asset) => sum + asset.size, 0) }), [assets]);

  function openDetail(asset: Asset) {
    setDetail(asset);
    setAltText(asset.altText);
    setLinkProduct("none");
  }

  function toggleSelected(path: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path); else next.add(path);
      return next;
    });
  }

  async function uploadFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList).filter((file) => file.type.startsWith("image/"));
    if (!files.length) { setError("Choose JPEG, PNG, or WebP images up to 10 MB."); return; }
    setUploading(true); setError(null); setNotice(null);
    let completed = 0;
    try {
      for (const file of files) {
        const form = new FormData();
        form.set("file", file);
        if (selectedUploadProduct !== "none") form.set("productId", selectedUploadProduct);
        const response = await fetch("/api/store/media-library", { method: "POST", body: form });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || `${file.name} could not be uploaded.`);
        completed += 1;
      }
      setNotice(`${completed} ${completed === 1 ? "file" : "files"} uploaded successfully.`);
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Upload failed."); }
    finally { setUploading(false); if (inputRef.current) inputRef.current.value = ""; }
  }

  async function saveDetail() {
    if (!detail) return;
    setSaving(true); setError(null); setNotice(null);
    try {
      const response = await fetch("/api/store/media-library", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path: detail.path, altText, productId: linkProduct === "none" ? undefined : linkProduct }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Media changes could not be saved.");
      setDetail(null); setNotice("Media details updated."); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Media changes could not be saved."); }
    finally { setSaving(false); }
  }

  async function moveToBin(asset: Asset) {
    if (!window.confirm(`Move ${asset.fileName} to Recently deleted?`)) return;
    setError(null); setNotice(null);
    const response = await fetch("/api/store/media-library", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path: asset.path }) });
    const payload = await response.json();
    if (!response.ok) { setError(payload.error || "The file could not be moved to Recently deleted."); return; }
    setAssets((current) => current.filter((item) => item.path !== asset.path));
    setSelected((current) => { const next = new Set(current); next.delete(asset.path); return next; });
    if (detail?.path === asset.path) setDetail(null);
    setNotice("File moved to Recently deleted.");
  }

  async function copyUrl(asset: Asset) {
    await navigator.clipboard.writeText(asset.url);
    setNotice("Public URL copied.");
  }

  return (
    <section className="space-y-5 text-sm">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Content</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Files</h1><p className="mt-1 text-sm text-muted-foreground">Upload, organize, and connect media to your products.</p></div>
        <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}><IconRefresh className={cn("size-4", loading && "animate-spin")} /> Refresh</Button><Button size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}><IconUpload className="size-4" /> Upload files</Button><input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(event) => event.target.files && void uploadFiles(event.target.files)} /></div>
      </header>

      {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive"><IconAlertCircle className="mt-0.5 size-4 shrink-0" /> <span>{error}</span><button className="ml-auto" onClick={() => setError(null)} aria-label="Dismiss error"><IconX className="size-4" /></button></div>}
      {notice && <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400"><IconCheck className="size-4" /> {notice}</div>}

      <Card className={cn("border-dashed transition-colors", dragging && "border-primary bg-primary/5")} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); void uploadFiles(event.dataTransfer.files); }}>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-center">
          <div className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary"><IconCloudUpload className="size-7" /></div>
          <div><p className="font-medium">Drop images here to upload</p><p className="mt-1 text-xs text-muted-foreground">JPEG, PNG, or WebP up to 10 MB. You can select multiple files.</p></div>
          <div className="flex flex-wrap items-center justify-center gap-2"><Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>{uploading ? <IconLoader2 className="size-4 animate-spin" /> : <IconUpload className="size-4" />} {uploading ? "Uploading…" : "Choose files"}</Button><Select value={selectedUploadProduct} onValueChange={(value) => setSelectedUploadProduct(value ?? "none")}><SelectTrigger className="h-9 w-56 text-xs"><IconPackage className="size-3.5 text-muted-foreground" /><SelectValue placeholder="Attach to product (optional)" /></SelectTrigger><SelectContent><SelectItem value="none">No product reference</SelectItem>{products.map((product) => <SelectItem key={product.id} value={product.id}>{product.title}</SelectItem>)}</SelectContent></Select></div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Card size="sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">All files</p><p className="mt-2 text-2xl font-semibold">{stats.total}</p></CardContent></Card><Card size="sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Product references</p><p className="mt-2 text-2xl font-semibold">{stats.referenced}</p></CardContent></Card><Card size="sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Unreferenced</p><p className="mt-2 text-2xl font-semibold">{stats.unreferenced}</p></CardContent></Card><Card size="sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Storage used</p><p className="mt-2 text-2xl font-semibold">{formatBytes(stats.size)}</p></CardContent></Card></div>

      <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 shadow-sm lg:flex-row lg:items-center"><div className="relative min-w-0 flex-1"><IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search files, folders, or product references" className="h-9 rounded-lg pl-9" /></div><div className="flex flex-wrap items-center gap-2"><Select value={folder} onValueChange={(value) => setFolder(value ?? "all")}><SelectTrigger className="h-9 w-36 text-xs"><IconFilter className="size-3.5 text-muted-foreground" /><SelectValue /></SelectTrigger><SelectContent>{folders.map((item) => <SelectItem key={item} value={item}>{item === "all" ? "All folders" : item}</SelectItem>)}</SelectContent></Select><Select value={referenceFilter} onValueChange={(value) => setReferenceFilter(value ?? "all")}><SelectTrigger className="h-9 w-40 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All references</SelectItem><SelectItem value="referenced">Referenced</SelectItem><SelectItem value="unreferenced">Unreferenced</SelectItem></SelectContent></Select><div className="flex rounded-lg border p-0.5"><Button variant={view === "grid" ? "secondary" : "ghost"} size="icon-xs" aria-label="Grid view" onClick={() => setView("grid")}><IconGrid3x3 /></Button><Button variant={view === "list" ? "secondary" : "ghost"} size="icon-xs" aria-label="List view" onClick={() => setView("list")}><IconList /></Button></div></div></div>

      {selected.size > 0 && <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5 text-xs"><span className="font-medium">{selected.size} selected</span><Button variant="ghost" size="xs" onClick={() => setSelected(new Set())}>Clear selection</Button><span className="ml-auto text-muted-foreground">Referenced files cannot be moved to the bin.</span></div>}

      {loading ? <div className="grid min-h-64 place-items-center rounded-xl border bg-card text-sm text-muted-foreground"><IconLoader2 className="mr-2 size-4 animate-spin" /> Loading media library…</div> : !filtered.length ? <Card><CardContent className="grid min-h-64 place-items-center text-center"><div><IconPhoto className="mx-auto size-8 text-muted-foreground" /><h2 className="mt-3 font-semibold">{assets.length ? "No files match these filters" : "Your media library is empty"}</h2><p className="mt-1 text-sm text-muted-foreground">{assets.length ? "Try a different search or clear a filter." : "Upload your first product image to get started."}</p></div></CardContent></Card> : view === "grid" ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{filtered.map((asset) => <Card key={asset.path} className="overflow-hidden"><div className="relative aspect-[4/3] bg-muted"><Checkbox checked={selected.has(asset.path)} onCheckedChange={() => toggleSelected(asset.path)} aria-label={`Select ${asset.fileName}`} className="absolute left-3 top-3 z-10 bg-background/90" />{isImage(asset) ? <img src={asset.url} alt={asset.altText || asset.fileName} className="size-full object-cover" loading="lazy" /> : <div className="grid size-full place-items-center"><IconFile className="size-10 text-muted-foreground" /></div>}<div className="absolute right-2 top-2"><DropdownMenu><DropdownMenuTrigger render={<Button variant="secondary" size="icon-xs" className="bg-background/90" aria-label={`Actions for ${asset.fileName}`} />}><IconDots /></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => openDetail(asset)}><IconPencil /> Edit details</DropdownMenuItem><DropdownMenuItem onClick={() => void copyUrl(asset)}><IconClipboard /> Copy public URL</DropdownMenuItem><DropdownMenuItem onClick={() => window.open(asset.url, "_blank", "noopener,noreferrer")}><IconExternalLink /> Open file</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem variant="destructive" onClick={() => void moveToBin(asset)}><IconTrash /> Move to bin</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div></div><CardContent className="space-y-3 p-3"><div className="min-w-0"><p className="truncate font-medium" title={asset.fileName}>{asset.fileName}</p><p className="mt-1 truncate text-xs text-muted-foreground">{asset.folder} · {formatBytes(asset.size)}</p></div><div className="flex items-center justify-between gap-2"><Badge variant={asset.referenced ? "secondary" : "outline"}>{asset.referenced ? `${asset.references.length} reference${asset.references.length === 1 ? "" : "s"}` : "Unreferenced"}</Badge><Button variant="ghost" size="xs" onClick={() => openDetail(asset)}>Manage</Button></div></CardContent></Card>)}</div> : <div className="overflow-hidden rounded-xl border bg-card"><div className="grid grid-cols-[auto_1fr_140px_120px_auto] gap-3 border-b bg-muted/30 px-4 py-3 text-xs font-medium text-muted-foreground"><span /><span>File</span><span>Folder</span><span>References</span><span /></div>{filtered.map((asset) => <div key={asset.path} className="grid grid-cols-[auto_1fr_140px_120px_auto] items-center gap-3 border-b px-4 py-3 last:border-0"><Checkbox checked={selected.has(asset.path)} onCheckedChange={() => toggleSelected(asset.path)} aria-label={`Select ${asset.fileName}`} /><button className="flex min-w-0 items-center gap-3 text-left" onClick={() => openDetail(asset)}><span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted">{isImage(asset) ? <img src={asset.url} alt="" className="size-full object-cover" /> : <IconFile className="size-4" />}</span><span className="min-w-0"><span className="block truncate font-medium">{asset.fileName}</span><span className="block truncate text-xs text-muted-foreground">{formatBytes(asset.size)} · {formatDate(asset.updatedAt)}</span></span></button><span className="truncate text-xs text-muted-foreground">{asset.folder}</span><Badge variant={asset.referenced ? "secondary" : "outline"}>{asset.referenced ? asset.references.length : "None"}</Badge><DropdownMenu><DropdownMenuTrigger render={<Button variant="ghost" size="icon-xs" aria-label={`Actions for ${asset.fileName}`} />}><IconDots /></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => openDetail(asset)}><IconPencil /> Edit details</DropdownMenuItem><DropdownMenuItem variant="destructive" onClick={() => void moveToBin(asset)}><IconTrash /> Move to bin</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>)}</div>}

      <Dialog open={Boolean(detail)} onOpenChange={(open) => !open && setDetail(null)}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Manage media</DialogTitle><DialogDescription>Edit accessibility details and connect this file to products.</DialogDescription></DialogHeader>{detail && <div className="grid gap-5 md:grid-cols-[220px_1fr]"><div className="overflow-hidden rounded-xl border bg-muted"><img src={detail.url} alt={altText || detail.fileName} className="aspect-square size-full object-cover" /></div><div className="space-y-4"><div><p className="text-xs font-medium text-muted-foreground">File</p><p className="mt-1 truncate font-medium">{detail.fileName}</p><p className="mt-1 text-xs text-muted-foreground">{detail.folder} · {formatBytes(detail.size)} · {formatDate(detail.updatedAt)}</p></div><label className="grid gap-2 text-sm font-medium">Alt text<Input value={altText} onChange={(event) => setAltText(event.target.value)} maxLength={240} placeholder="Describe this image" /><span className="text-xs font-normal text-muted-foreground">Used by product images and screen readers.</span></label><label className="grid gap-2 text-sm font-medium">Reference another product<Select value={linkProduct} onValueChange={(value) => setLinkProduct(value ?? "none")}><SelectTrigger><SelectValue placeholder="Choose a product" /></SelectTrigger><SelectContent><SelectItem value="none">No new reference</SelectItem>{products.filter((product) => !detail.references.some((reference) => reference.type === "product" && reference.productId === product.id)).map((product) => <SelectItem key={product.id} value={product.id}>{product.title}</SelectItem>)}</SelectContent></Select></label><div className="rounded-xl border bg-muted/20 p-3"><div className="flex items-center gap-2 text-xs font-medium"><IconLink className="size-4" /> Current references</div>{detail.references.length ? <div className="mt-2 space-y-1.5">{detail.references.map((reference) => <div key={`${reference.type}-${reference.id}`} className="flex items-center gap-2 text-xs"><IconCheck className="size-3 text-emerald-600" /><span className="truncate">{reference.label}</span><Badge variant="outline" className="ml-auto capitalize">{reference.type}</Badge></div>)}</div> : <p className="mt-2 text-xs text-muted-foreground">This file is not connected to a product or category.</p>}</div></div></div>}<DialogFooter><Button variant="outline" onClick={() => setDetail(null)}>Cancel</Button><Button onClick={() => void saveDetail()} disabled={saving}>{saving && <IconLoader2 className="size-4 animate-spin" />} Save changes</Button></DialogFooter></DialogContent></Dialog>
    </section>
  );
}


