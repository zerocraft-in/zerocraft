"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  IconArrowLeft,
  IconCheck,
  IconChevronRight,
  IconFileText,
  IconGripVertical,
  IconLink,
  IconPlus,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";
import { Badge } from "@zerocraft/components/ui/badge";
import { Button } from "@zerocraft/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@zerocraft/components/ui/dialog";
import { Input } from "@zerocraft/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@zerocraft/components/ui/select";
import { handleize, validateContent, type ContentRecord, type MenuItem } from "@/lib/content-model";

type Mode = "list" | "create" | "edit";
const panel = "rounded-xl border bg-card shadow-sm";
const linkOptions = [
  { category: "Online store", label: "Home page", url: "/" },
  { category: "Online store", label: "Search", url: "/search" },
  { category: "Collections", label: "All collections", url: "/collections/all" },
  { category: "Products", label: "All products", url: "/products" },
  { category: "Pages", label: "Pages", url: "/pages" },
  { category: "Blogs", label: "Blogs", url: "/blogs" },
  { category: "Blog posts", label: "Latest blog posts", url: "/blogs/news" },
  { category: "Policies", label: "Terms of service", url: "/policies/terms-of-service" },
];
const blankMenu = (): ContentRecord => ({
  id: "", kind: "menus", title: "", handle: "", status: "draft", parent_id: null,
  data: { items: [] }, updated_at: "",
});
const menuItems = (record: ContentRecord | null) => (Array.isArray(record?.data.items) ? record.data.items : []) as MenuItem[];

export function MenusWorkspace({ mode, id }: { mode: Mode; id?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const basePath = pathname.slice(0, pathname.indexOf("/content/menus") + "/content/menus".length);
  const [records, setRecords] = useState<ContentRecord[]>([]);
  const [record, setRecord] = useState<ContentRecord | null>(mode === "create" ? blankMenu() : null);
  const [loading, setLoading] = useState(mode !== "create");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [revision, setRevision] = useState(0);
  const [deleting, setDeleting] = useState<ContentRecord | null>(null);
  const dragged = useRef<string | null>(null);

  useEffect(() => {
    if (mode === "create") { setRecord(blankMenu()); setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true);
    setError("");
    void fetch("/api/store/content/menus", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Menus could not be loaded.");
        const rows = payload.records as ContentRecord[];
        if (controller.signal.aborted) return;
        setRecords(rows);
        if (mode === "edit") {
          const found = rows.find((item) => item.id === id);
          if (!found) throw new Error("This menu could not be found.");
          setRecord(found);
        }
      })
      .catch((cause) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Menus could not be loaded."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, mode, revision]);

  const visible = useMemo(() => records.filter((item) =>
    (status === "all" || item.status === status) && `${item.title} ${item.handle}`.toLowerCase().includes(search.trim().toLowerCase()),
  ), [records, search, status]);
  const counts = useMemo(() => ({
    all: records.length,
    active: records.filter((item) => item.status === "active").length,
    draft: records.filter((item) => item.status === "draft").length,
  }), [records]);
  const items = menuItems(record);

  function updateItem(index: number, values: Partial<MenuItem>) {
    setRecord((current) => current && { ...current, data: { ...current.data, items: menuItems(current).map((item, position) => position === index ? { ...item, ...values } : item) } });
  }
  function addItem(depth = 0, afterIndex?: number) {
    const next: MenuItem[] = [...items];
    let insertAt = next.length;
    if (afterIndex !== undefined) {
      insertAt = afterIndex + 1;
      while (insertAt < next.length && next[insertAt].depth > next[afterIndex].depth) insertAt++;
    }
    next.splice(insertAt, 0, { id: crypto.randomUUID(), label: "", url: "", depth, tags: "" });
    setRecord((current) => current && { ...current, data: { ...current.data, items: next } });
  }
  function removeItem(index: number) {
    const end = subtreeEnd(items, index);
    setRecord((current) => current && { ...current, data: { ...current.data, items: items.filter((_, position) => position < index || position > end) } });
  }
  function reorder(targetIndex: number) {
    const sourceIndex = items.findIndex((item) => item.id === dragged.current);
    dragged.current = null;
    if (sourceIndex < 0 || sourceIndex === targetIndex || items[sourceIndex].depth !== items[targetIndex].depth) return;
    const sourceEnd = subtreeEnd(items, sourceIndex);
    const block = items.slice(sourceIndex, sourceEnd + 1);
    if (targetIndex >= sourceIndex && targetIndex <= sourceEnd) return;
    const next = [...items];
    next.splice(sourceIndex, block.length);
    const destination = targetIndex > sourceIndex ? targetIndex - block.length : targetIndex;
    next.splice(destination, 0, ...block);
    setRecord((current) => current && { ...current, data: { ...current.data, items: next } });
  }
  async function save() {
    if (!record) return;
    const invalid = validateContent("menus", record);
    if (invalid) { setError(invalid); return; }
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/store/content/menus", {
        method: record.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Menu could not be saved.");
      router.push(basePath);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Menu could not be saved."); }
    finally { setSaving(false); }
  }
  async function removeMenu() {
    if (!deleting) return;
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/store/content/menus", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: deleting.id }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Menu could not be deleted.");
      setDeleting(null); setRevision((value) => value + 1);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Menu could not be deleted."); }
    finally { setSaving(false); }
  }

  if (mode === "list") return (
    <section className="mx-auto w-full max-w-[1440px] space-y-5 px-1 pb-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2"><IconFileText className="size-5 text-muted-foreground" /><div><h1 className="text-xl font-semibold tracking-tight">Menus</h1><p className="mt-0.5 text-sm text-muted-foreground">Manage the links customers use to navigate your store.</p></div></div>
        <div className="flex gap-2"><Button variant="outline" onClick={() => router.push(`${basePath}/redirects`)}>URL redirects</Button><Button onClick={() => router.push(`${basePath}/new`)}><IconPlus className="size-4" />Create menu</Button></div>
      </header>
      {error && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}<Button variant="ghost" size="xs" onClick={() => setRevision((value) => value + 1)}>Retry</Button></div>}
      <div className={`${panel} overflow-hidden`}>
        <div className="flex flex-wrap items-center gap-1 border-b px-4 pt-2">
          {(["all", "active", "draft"] as const).map((tab) => <button key={tab} onClick={() => setStatus(tab)} className={`border-b-2 px-3 py-3 text-sm capitalize ${status === tab ? "border-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{tab === "all" ? "All" : tab} <span className="ml-1 text-xs text-muted-foreground">{counts[tab]}</span></button>)}
        </div>
        <div className="flex flex-wrap items-center gap-3 border-b p-3">
          <div className="w-40"><Select value={status} onValueChange={(value) => value && setStatus(value)}><SelectTrigger aria-label="Filter menu status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="draft">Draft</SelectItem></SelectContent></Select></div>
          <div className="relative min-w-56 flex-1"><IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search menus" className="pl-9" /></div>
        </div>
        {loading ? <div className="grid min-h-64 place-items-center text-sm text-muted-foreground">Loading menus…</div> : visible.length ? (
          <div className="divide-y">
            {visible.map((menu) => {
              const rows = menuItems(menu);
              return <div key={menu.id} className="group flex min-h-16 items-center gap-4 px-4 py-3 hover:bg-muted/30">
                <button className="min-w-0 flex-1 text-left" onClick={() => router.push(`${basePath}/${menu.id}`)}><span className="block truncate font-medium">{menu.title}</span><span className="mt-0.5 block truncate text-xs text-muted-foreground">{menu.handle}</span></button>
                <span className="hidden w-24 text-sm text-muted-foreground sm:block">{rows.length} {rows.length === 1 ? "item" : "items"}</span>
                <Badge variant={menu.status === "active" ? "secondary" : "outline"}>{menu.status === "active" ? "Active" : "Draft"}</Badge>
                <Button variant="ghost" size="icon-sm" aria-label={`Delete ${menu.title}`} onClick={() => setDeleting(menu)}><IconTrash className="size-4" /></Button>
                <IconChevronRight className="size-4 text-muted-foreground" />
              </div>;
            })}
          </div>
        ) : (
          <div className="grid min-h-[390px] place-items-center px-6 py-12 text-center">
            <div className="max-w-sm"><div className="mx-auto grid size-12 place-items-center rounded-xl bg-muted"><IconFileText className="size-6 text-muted-foreground" /></div><h2 className="mt-4 text-base font-semibold">{records.length ? "No menus match your search" : "No menus yet"}</h2><p className="mt-1 text-sm text-muted-foreground">{records.length ? "Try a different search or status filter." : "Create a menu to give customers clear paths through your store."}</p>{!records.length && <Button className="mt-5" onClick={() => router.push(`${basePath}/new`)}><IconPlus className="size-4" />Create menu</Button>}</div>
          </div>
        )}
      </div>
      <Dialog open={Boolean(deleting)} onOpenChange={(open) => !open && !saving && setDeleting(null)}><DialogContent><DialogHeader><DialogTitle>Delete {deleting?.title}?</DialogTitle><DialogDescription>This removes the menu from your store navigation.</DialogDescription></DialogHeader>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<DialogFooter><Button variant="outline" onClick={() => setDeleting(null)} disabled={saving}>Cancel</Button><Button variant="destructive" onClick={() => void removeMenu()} disabled={saving}>{saving ? "Deleting…" : "Delete menu"}</Button></DialogFooter></DialogContent></Dialog>
    </section>
  );

  if (loading) return <div role="status" className="grid min-h-64 place-items-center text-sm text-muted-foreground">Loading menu…</div>;
  if (!record) return <div role="alert" className="p-8 text-center text-sm text-muted-foreground">{error || "Menu not found."}<div><Button variant="outline" className="mt-3" onClick={() => router.push(basePath)}>Back to menus</Button></div></div>;

  return (
    <section className="min-h-full pb-12">
      <div className="sticky top-0 z-20 -mx-1 mb-8 flex items-center justify-between gap-3 rounded-xl border bg-background/95 px-3 py-2 shadow-sm backdrop-blur sm:px-5">
        <Button variant="ghost" onClick={() => router.push(basePath)}><IconArrowLeft className="size-4" />Menus</Button>
        <div className="flex items-center gap-2"><Badge variant="outline" className="hidden sm:inline-flex">Unsaved changes</Badge><Button variant="outline" onClick={() => router.push(basePath)} disabled={saving}>Discard</Button><Button onClick={() => void save()} disabled={saving}>{saving ? "Saving…" : <><IconCheck className="size-4" />Save</>}</Button></div>
      </div>
      <div className="mx-auto max-w-[720px] space-y-7 px-1">
        <div><p className="text-xs text-muted-foreground">Content <span className="px-1">/</span> Menus</p><h1 className="mt-2 text-2xl font-semibold tracking-tight">{mode === "create" ? "Add menu" : "Edit menu"}</h1></div>
        {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
        <section className={`${panel} space-y-3 p-4`}>
          <label className="grid gap-2 text-sm font-medium">Name<Input autoFocus required maxLength={200} placeholder="e.g., Main menu" value={record.title} onChange={(event) => { const title = event.target.value; setRecord((current) => current && { ...current, title, handle: !current.handle || current.handle === handleize(current.title) ? handleize(title) : current.handle }); }} /></label>
          <p className="text-sm text-muted-foreground">Handle: <span className="font-mono text-xs">{record.handle || handleize(record.title) || "menu-handle"}</span></p>
          <div className="flex items-center gap-3 border-t pt-3"><span className="text-sm text-muted-foreground">Status</span><Select value={record.status} onValueChange={(value) => value && setRecord((current) => current && { ...current, status: value as ContentRecord["status"] })}><SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="active">Active</SelectItem></SelectContent></Select></div>
        </section>
        <section className={`${panel} p-4`}>
          <div className="mb-4"><h2 className="font-semibold">Menu items</h2><p className="mt-1 text-sm text-muted-foreground">Add links and drag items to set their order. Indent links to make them nested.</p></div>
          <div className="space-y-2">
            {items.map((item, index) => <div key={item.id} draggable onDragStart={() => { dragged.current = item.id; }} onDragOver={(event) => event.preventDefault()} onDrop={() => reorder(index)} onDragEnd={() => { dragged.current = null; }} className={`rounded-lg border bg-background p-3 ${item.depth > 0 ? "ml-8 sm:ml-11" : ""}`}>
              <div className="grid gap-2 sm:grid-cols-[20px_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
                <button type="button" aria-label={`Drag menu item ${index + 1}`} className="hidden h-9 cursor-grab items-center justify-center text-muted-foreground active:cursor-grabbing sm:flex"><IconGripVertical className="size-4" /></button>
                <label className="grid min-w-0 gap-1.5 text-xs font-medium text-muted-foreground">Label<Input aria-label={`Label for item ${index + 1}`} className="h-9 text-sm text-foreground" placeholder="Label" value={item.label} onChange={(event) => updateItem(index, { label: event.target.value })} /></label>
                <label className="grid min-w-0 gap-1.5 text-xs font-medium text-muted-foreground">Link<LinkPicker value={item.url} onChange={(url) => updateItem(index, { url })} label={`Link for item ${index + 1}`} /></label>
                <div className="flex items-center justify-end gap-1"><Button type="button" variant="ghost" size="icon-sm" aria-label={`Add subitem under ${item.label || `item ${index + 1}`}`} disabled={item.depth >= 2} onClick={() => addItem(item.depth + 1, index)}><IconPlus className="size-4" /></Button><Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove ${item.label || `item ${index + 1}`}`} onClick={() => removeItem(index)}><IconTrash className="size-4" /></Button></div>
              </div>
              <label className="mt-3 grid gap-1.5 text-xs font-medium text-muted-foreground">Filter collection with tags (optional)<Input className="h-9 text-sm text-foreground" placeholder="Hats, blue, summer" value={item.tags || ""} onChange={(event) => updateItem(index, { tags: event.target.value })} /></label>
            </div>)}
          </div>
          <Button type="button" variant="outline" className="mt-3 w-full justify-start" onClick={() => addItem()}><IconPlus className="size-4 text-primary" />Add menu item</Button>
        </section>
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => router.push(basePath)} disabled={saving}>Discard</Button><Button onClick={() => void save()} disabled={saving}>{saving ? "Saving…" : "Save"}</Button></div>
      </div>
    </section>
  );
}

function subtreeEnd(items: MenuItem[], start: number) {
  let end = start;
  while (end + 1 < items.length && items[end + 1].depth > items[start].depth) end++;
  return end;
}

function LinkPicker({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = linkOptions.find((item) => item.url === value);
  const filtered = linkOptions.filter((item) => `${item.category} ${item.label} ${item.url}`.toLowerCase().includes(query.toLowerCase()));
  const groups = Array.from(new Set(filtered.map((item) => item.category)));
  return <div className="relative">
    <IconLink className="absolute left-2.5 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
    <Input aria-label={label} className="h-9 pl-8 text-sm text-foreground" placeholder="Search or paste link" value={open ? query : selected?.label || value} onFocus={() => { setQuery(selected?.label || value); setOpen(true); }} onChange={(event) => { const text = event.target.value; setQuery(text); onChange(text); setOpen(true); }} onBlur={() => setTimeout(() => setOpen(false), 120)} />
    {open && <div role="listbox" className="absolute left-0 top-full z-40 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border bg-popover p-1.5 text-popover-foreground shadow-lg">
      {groups.map((group) => <div key={group}><p className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground">{group}</p>{filtered.filter((item) => item.category === group).map((option) => <button key={option.url} type="button" role="option" aria-selected={value === option.url} onMouseDown={(event) => event.preventDefault()} onClick={() => { onChange(option.url); setQuery(""); setOpen(false); }} className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted"><IconLink className="size-4 text-muted-foreground" /><span className="flex-1">{option.label}</span><span className="text-xs text-muted-foreground">{option.url}</span></button>)}</div>)}
      {!filtered.length && <p className="px-2 py-3 text-sm text-muted-foreground">No matching links. Enter a URL or path.</p>}
    </div>}
  </div>;
}
