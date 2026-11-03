"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  IconAlertCircle,
  IconCheck,
  IconClipboard,
  IconCloudUpload,
  IconDots,
  IconExternalLink,
  IconFile,
  IconFilter,
  IconFolder,
  IconGrid3x3,
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
import { Badge } from "@zerocraft/components/ui/badge";
import { Button } from "@zerocraft/components/ui/button";
import { Card, CardContent } from "@zerocraft/components/ui/card";
import { Checkbox } from "@zerocraft/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@zerocraft/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@zerocraft/components/ui/dropdown-menu";
import { Input } from "@zerocraft/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@zerocraft/components/ui/select";
import { cn } from "cn";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@zerocraft/components/ui/table";

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

export function FilesMediaManager({ storeId }: { storeId?: string }) {
  const mediaEndpoint = storeId ? `/api/platform/stores/${storeId}/media-assets` : "/api/store/media-library";
  const folderEndpoint = storeId ? `/api/platform/stores/${storeId}/media-folders` : "/api/store/content/folders";
  const inputRef = useRef<HTMLInputElement>(null);
  const [customFolders, setCustomFolders] = useState<string[]>([]);
  const [folderOpen, setFolderOpen] = useState(false);
  const [newFolder, setNewFolder] = useState("");
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [detailFolder, setDetailFolder] = useState("library");
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
  const [view, setView] = useState<"grid" | "list">("list");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<Asset | null>(null);
  const [altText, setAltText] = useState("");
  const [linkProduct, setLinkProduct] = useState("none");
  const [saving, setSaving] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [sortNewest, setSortNewest] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(mediaEndpoint, { cache: "no-store", signal: AbortSignal.timeout(20_000) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Media library could not be loaded.");
      setAssets(payload.assets || []);
      setProducts(payload.products || []);
      const foldersResponse = await fetch(folderEndpoint, { cache: "no-store", signal: AbortSignal.timeout(20_000) });
      if (foldersResponse.ok) { const result = await foldersResponse.json(); setCustomFolders(storeId ? result.folders.map((item: { name: string }) => item.name) : result.records.map((item: { title: string }) => item.title)); }
    } catch (cause) {
      setError(cause instanceof Error && cause.name === "TimeoutError" ? "The media library request timed out. Check the storage connection and retry." : cause instanceof Error ? cause.message : "Media library could not be loaded.");
    } finally { setLoading(false); }
  }, [folderEndpoint, mediaEndpoint, storeId]);

  useEffect(() => { void load(); }, [load]);

  const folders = useMemo(() => ["all", ...Array.from(new Set([...customFolders, ...assets.map((asset) => asset.folder).filter(Boolean)]))], [assets, customFolders]);
  const filtered = useMemo(() => assets.filter((asset) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || `${asset.fileName} ${asset.folder} ${asset.altText} ${asset.references.map((reference) => reference.label).join(" ")}`.toLowerCase().includes(query);
    const matchesFolder = folder === "all" || asset.folder === folder;
    const matchesReference = referenceFilter === "all" || (referenceFilter === "referenced" ? asset.referenced : !asset.referenced);
    return matchesSearch && matchesFolder && matchesReference;
  }), [assets, folder, referenceFilter, search]);



  function openDetail(asset: Asset) {
    setDetail(asset);
    setAltText(asset.altText);
    setFileName(asset.fileName);
    setDetailFolder(asset.folder);
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
    const files = Array.from(fileList);
    if (!files.length) { setError("Choose one or more files to upload."); return; }
    setUploading(true); setError(null); setNotice(null);
    let completed = 0;
    try {
      for (const file of files) {
        const form = new FormData();
        form.set("file", file);
        form.set("folder", folder === "all" ? (storeId ? "Library" : "library") : folder);
        if (selectedUploadProduct !== "none") form.set("productId", selectedUploadProduct);
        const response = await fetch(mediaEndpoint, { method: "POST", body: form });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || `${file.name} could not be uploaded.`);
        completed += 1;
      }
      setNotice(`${completed} ${completed === 1 ? "file" : "files"} uploaded successfully.`);
      setUploadOpen(false);
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Upload failed."); }
    finally { setUploading(false); if (inputRef.current) inputRef.current.value = ""; }
  }

  async function saveDetail() {
    if (!detail) return;
    setSaving(true); setError(null); setNotice(null);
    try {
      const response = await fetch(mediaEndpoint, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path: detail.path, altText, fileName, folder: detailFolder, productId: linkProduct === "none" ? undefined : linkProduct }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Media changes could not be saved.");
      setDetail(null); setNotice("Media details updated."); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Media changes could not be saved."); }
    finally { setSaving(false); }
  }

  async function moveToBin(asset: Asset) {
    if (!window.confirm(storeId ? `Permanently delete ${asset.fileName} from R2?` : `Move ${asset.fileName} to Recently deleted?`)) return;
    setError(null); setNotice(null);
    try {
    const response = await fetch(mediaEndpoint, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path: asset.path }) });
    const payload = await response.json();
    if (!response.ok) { setError(payload.error || "The file could not be moved to Recently deleted."); return; }
    setAssets((current) => current.filter((item) => item.path !== asset.path));
    setSelected((current) => { const next = new Set(current); next.delete(asset.path); return next; });
    if (detail?.path === asset.path) setDetail(null);
    setNotice(storeId ? "File deleted from R2." : "File moved to Recently deleted.");
    } catch { setError("The file could not be moved. Check your connection and try again."); }
  }

  async function copyUrl(asset: Asset) {
    await navigator.clipboard.writeText(asset.url);
    setNotice("Public URL copied.");
  }

  return (
    <section className="space-y-3 text-sm [&_[data-slot=button]]:rounded-lg">
      <header className="flex flex-wrap items-center justify-between gap-3 py-1"><div className="flex items-center gap-2"><IconFile className="size-4" /><h1 className="text-base font-semibold">Media Manager</h1></div><div className="flex flex-wrap gap-2">{storeId && folder !== "all" && folder !== "Library" && <><Button variant="outline" size="sm" onClick={() => { setEditingFolder(folder); setNewFolder(folder); setFolderOpen(true); }}><IconPencil />Rename folder</Button><Button variant="outline" size="sm" onClick={async () => { if (!window.confirm(`Delete the empty folder “${folder}”?`)) return; try { const response = await fetch(folderEndpoint, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: folder }) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error); setFolder("all"); await load(); setNotice("Folder deleted."); } catch (cause) { setError(cause instanceof Error ? cause.message : "Folder could not be deleted."); } }}><IconTrash />Delete folder</Button></>}<Button variant="outline" size="sm" onClick={() => { setEditingFolder(null); setNewFolder(""); setFolderOpen(true); }}><IconFolder />New folder</Button><Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}><IconRefresh className={cn("size-4", loading && "animate-spin")} /> Refresh</Button><Button size="sm" onClick={() => setUploadOpen(true)} disabled={uploading}><IconUpload className="size-4" /> Upload files</Button><input ref={inputRef} type="file" multiple className="hidden" onChange={(event) => event.target.files && void uploadFiles(event.target.files)} /></div></header>

      {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive"><IconAlertCircle className="mt-0.5 size-4 shrink-0" /> <span>{error}</span><button className="ml-auto" onClick={() => setError(null)} aria-label="Dismiss error"><IconX className="size-4" /></button></div>}
      {notice && <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400"><IconCheck className="size-4" /> {notice}</div>}

      <Dialog open={folderOpen} onOpenChange={setFolderOpen}><DialogContent><DialogHeader><DialogTitle>{editingFolder ? "Rename folder" : "New folder"}</DialogTitle><DialogDescription>{editingFolder ? "Rename the folder and keep its files together." : "Create a folder to organize files."}</DialogDescription></DialogHeader><form id="new-media-folder" onSubmit={async event => { event.preventDefault(); setSaving(true); setError(null); try { const response = await fetch(folderEndpoint, { method: storeId ? (editingFolder ? "PATCH" : "POST") : "POST", headers: { "Content-Type": "application/json" }, body: storeId ? (editingFolder ? JSON.stringify({ oldName: editingFolder, newName: newFolder.trim() }) : JSON.stringify({ name: newFolder.trim() })) : JSON.stringify({ title: newFolder.trim(), handle: newFolder.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), status: "active", data: {} }) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error); if (editingFolder) { setCustomFolders(current => current.map(item => item === editingFolder ? newFolder.trim() : item)); setFolder(current => current === editingFolder ? newFolder.trim() : current); setDetailFolder(current => current === editingFolder ? newFolder.trim() : current); } else { setCustomFolders(current => [...current, newFolder.trim()]); setFolder(newFolder.trim()); } setFolderOpen(false); setNewFolder(""); setEditingFolder(null); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Folder could not be saved."); } finally { setSaving(false); } }}><label className="grid gap-2 text-sm">Folder name<Input required maxLength={120} value={newFolder} onChange={event => setNewFolder(event.target.value)} /></label>{error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}</form><DialogFooter><Button variant="outline" onClick={() => setFolderOpen(false)}>Cancel</Button><Button form="new-media-folder" type="submit" disabled={saving}>{editingFolder ? "Save folder" : "Create folder"}</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}><DialogContent><DialogHeader><DialogTitle>Upload files</DialogTitle><DialogDescription>Upload assets to this store’s Cloudflare R2 media storage.</DialogDescription></DialogHeader>      <Card className={cn("border-dashed transition-colors", dragging && "border-primary bg-primary/5")} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); void uploadFiles(event.dataTransfer.files); }}>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-center">{error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary"><IconCloudUpload className="size-7" /></div>
          <div><p className="font-medium">Drop files here to upload</p><p className="mt-1 text-xs text-muted-foreground">Up to 50 MB per file. You can select multiple files.</p></div>
          <div className="flex flex-wrap items-center justify-center gap-2"><Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>{uploading ? <IconLoader2 className="size-4 animate-spin" /> : <IconUpload className="size-4" />} {uploading ? "Uploading…" : "Choose files"}</Button>{!storeId && <Select value={selectedUploadProduct} onValueChange={(value) => setSelectedUploadProduct(value ?? "none")}><SelectTrigger className="h-9 w-56 text-xs"><IconPackage className="size-3.5 text-muted-foreground" /><SelectValue placeholder="Attach to product (optional)" /></SelectTrigger><SelectContent><SelectItem value="none">No product reference</SelectItem>{products.map((product) => <SelectItem key={product.id} value={product.id}>{product.title}</SelectItem>)}</SelectContent></Select>}</div>
        </CardContent>
      </Card>
</DialogContent></Dialog>

      <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 shadow-sm lg:flex-row lg:items-center"><div className="relative min-w-0 flex-1"><IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={storeId ? "Search files and folders" : "Search files, folders, or product references"} className="h-9 rounded-lg pl-9" /></div><div className="flex flex-wrap items-center gap-2"><Select value={folder} onValueChange={(value) => setFolder(value ?? "all")}><SelectTrigger className="h-9 w-36 text-xs"><IconFilter className="size-3.5 text-muted-foreground" /><SelectValue /></SelectTrigger><SelectContent>{folders.map((item) => <SelectItem key={item} value={item}>{item === "all" ? "All folders" : item}</SelectItem>)}</SelectContent></Select>{!storeId && <Select value={referenceFilter} onValueChange={(value) => setReferenceFilter(value ?? "all")}><SelectTrigger className="h-9 w-40 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All references</SelectItem><SelectItem value="referenced">Referenced</SelectItem><SelectItem value="unreferenced">Unreferenced</SelectItem></SelectContent></Select>}<div className="flex rounded-lg border p-0.5"><Button variant={view === "grid" ? "secondary" : "ghost"} size="icon-xs" aria-label="Grid view" onClick={() => setView("grid")}><IconGrid3x3 /></Button><Button variant={view === "list" ? "secondary" : "ghost"} size="icon-xs" aria-label="List view" onClick={() => setView("list")}><IconList /></Button></div></div></div>

      {selected.size > 0 && <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5 text-xs"><span className="font-medium">{selected.size} selected</span><Button variant="ghost" size="xs" onClick={() => setSelected(new Set())}>Clear selection</Button><span className="ml-auto text-muted-foreground">Referenced files cannot be moved to the bin.</span></div>}

      {loading ? <div className="grid min-h-64 place-items-center rounded-xl border bg-card text-sm text-muted-foreground"><IconLoader2 className="mr-2 size-4 animate-spin" /> Loading media library…</div> : !filtered.length ? <Card><CardContent className="grid min-h-64 place-items-center text-center"><div><IconPhoto className="mx-auto size-8 text-muted-foreground" /><h2 className="mt-3 font-semibold">{assets.length ? "No files match these filters" : "Your media library is empty"}</h2><p className="mt-1 text-sm text-muted-foreground">{assets.length ? "Try a different search or clear a filter." : "Upload your first product image to get started."}</p></div></CardContent></Card> : view === "grid" ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{filtered.map((asset) => <Card key={asset.path} className="overflow-hidden"><div className="relative aspect-[4/3] bg-muted"><Checkbox checked={selected.has(asset.path)} onCheckedChange={() => toggleSelected(asset.path)} aria-label={`Select ${asset.fileName}`} className="absolute left-3 top-3 z-10 bg-background/90" />{isImage(asset) ? <img src={asset.url} alt={asset.altText || asset.fileName} className="size-full object-cover" loading="lazy" /> : <div className="grid size-full place-items-center"><IconFile className="size-10 text-muted-foreground" /></div>}<div className="absolute right-2 top-2"><DropdownMenu><DropdownMenuTrigger render={<Button variant="secondary" size="icon-xs" className="bg-background/90" aria-label={`Actions for ${asset.fileName}`} />}><IconDots /></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => openDetail(asset)}><IconPencil /> Edit details</DropdownMenuItem><DropdownMenuItem onClick={() => void copyUrl(asset)}><IconClipboard /> Copy public URL</DropdownMenuItem><DropdownMenuItem onClick={() => window.open(asset.url, "_blank", "noopener,noreferrer")}><IconExternalLink /> Open file</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem variant="destructive" onClick={() => void moveToBin(asset)}><IconTrash /> Move to bin</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div></div><CardContent className="space-y-3 p-3"><div className="min-w-0"><p className="truncate font-medium" title={asset.fileName}>{asset.fileName}</p><p className="mt-1 truncate text-xs text-muted-foreground">{asset.folder} · {formatBytes(asset.size)}</p></div><div className="flex items-center justify-between gap-2"><Badge variant={asset.referenced ? "secondary" : "outline"}>{asset.referenced ? `${asset.references.length} reference${asset.references.length === 1 ? "" : "s"}` : "Unreferenced"}</Badge><Button variant="ghost" size="xs" onClick={() => openDetail(asset)}>Manage</Button></div></CardContent></Card>)}</div> : <div className="overflow-hidden rounded-xl border bg-card"><Table><TableHeader><TableRow className="bg-muted/40"><TableHead><Checkbox aria-label="Select all visible files" checked={filtered.length > 0 && filtered.every(asset => selected.has(asset.path))} onCheckedChange={checked => setSelected(checked ? new Set(filtered.map(asset => asset.path)) : new Set())} /></TableHead><TableHead>File name</TableHead><TableHead>Alt text</TableHead><TableHead><button onClick={() => setSortNewest(value => !value)}>Date added {sortNewest ? "↓" : "↑"}</button></TableHead><TableHead className="text-right">Size</TableHead><TableHead>References</TableHead></TableRow></TableHeader><TableBody>{[...filtered].sort((a, b) => (new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()) * (sortNewest ? 1 : -1)).map(asset => <TableRow key={asset.path}><TableCell className="w-9"><Checkbox checked={selected.has(asset.path)} onCheckedChange={() => toggleSelected(asset.path)} aria-label={`Select ${asset.fileName}`} /></TableCell><TableCell><button className="flex items-center gap-3 text-left" onClick={() => openDetail(asset)}><span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg border bg-muted">{isImage(asset) ? <img src={asset.url} alt="" className="size-full object-cover" /> : <IconFile className="size-4" />}</span><span><span className="block font-medium">{asset.fileName}</span><span className="text-xs uppercase text-muted-foreground">{asset.mimeType.split("/")[1]}</span></span></button></TableCell><TableCell className="max-w-48 truncate text-xs">{asset.altText || "—"}</TableCell><TableCell className="whitespace-nowrap text-xs">{formatDate(asset.createdAt)}</TableCell><TableCell className="whitespace-nowrap text-right text-xs">{formatBytes(asset.size)}</TableCell><TableCell><button className="text-xs hover:underline" onClick={() => openDetail(asset)}>{asset.references.length ? `${asset.references.length} reference${asset.references.length > 1 ? "s" : ""}` : "—"}</button></TableCell></TableRow>)}</TableBody></Table></div>}


      <Dialog open={Boolean(detail)} onOpenChange={(open) => !open && setDetail(null)}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Manage file</DialogTitle><DialogDescription>Edit the file name, folder, and accessibility text.</DialogDescription></DialogHeader>{detail && <div className="grid gap-5 md:grid-cols-[220px_1fr]"><div className="grid min-h-48 place-items-center overflow-hidden rounded-xl border bg-muted">{isImage(detail) ? <img src={detail.url} alt={altText || detail.fileName} className="aspect-square size-full object-cover" /> : <IconFile className="size-12 text-muted-foreground" />}</div><div className="space-y-4"><div><p className="text-xs font-medium text-muted-foreground">File</p><Input aria-label="File name" value={fileName} maxLength={180} onChange={event => setFileName(event.target.value)} /><p className="mt-1 text-xs text-muted-foreground">{detail.folder} · {formatBytes(detail.size)} · {formatDate(detail.updatedAt)}</p></div><label className="grid gap-2 text-sm font-medium">Folder<Input value={detailFolder} maxLength={120} onChange={event => setDetailFolder(event.target.value)} list="media-folders" /><datalist id="media-folders">{folders.filter(item => item !== "all").map(item => <option key={item} value={item} />)}</datalist><span className="text-xs font-normal text-muted-foreground">Choose a folder that already exists.</span></label><label className="grid gap-2 text-sm font-medium">Alt text<Input value={altText} onChange={(event) => setAltText(event.target.value)} maxLength={240} placeholder="Describe this image" /><span className="text-xs font-normal text-muted-foreground">Used by product images and screen readers.</span></label></div></div>}<DialogFooter><Button variant="destructive" disabled={saving || Boolean(detail?.referenced)} onClick={() => detail && void moveToBin(detail)}>Delete file</Button><Button variant="outline" onClick={() => setDetail(null)}>Cancel</Button><Button onClick={() => void saveDetail()} disabled={saving}>{saving && <IconLoader2 className="size-4 animate-spin" />} Save changes</Button></DialogFooter></DialogContent></Dialog>
    </section>
  );
}


