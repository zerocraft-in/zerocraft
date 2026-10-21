"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import {
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconDots,
  IconFolder,
  IconHierarchy3,
  IconList,
  IconPhoto,
  IconPlus,
  IconSearch,
  IconSquareCheck,
  IconTag,
  IconTrash,
  IconUpload,
  IconX,
} from "@tabler/icons-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Subcategory = {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
};

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  is_active: boolean;
  store_subcategories?: Subcategory[];
};

type Product = { id: string; title: string; image_url: string; status: string; category_id: string | null; subcategory_id: string | null };
type StorePayload = { configured: boolean; categories: Category[]; products: Product[] };
type MediaAsset = { path: string; name: string; folder: string; url: string; mimeType: string; size: number; createdAt: string | null; updatedAt: string | null };
type CategoryDraft = {
  name: string;
  slug: string;
  description: string;
  image_url: string;
  is_active: boolean;
  parent_id: string;
  sort_order: number;
};
type Editor = { id?: string; originalKind?: "category" | "subcategory"; draft: CategoryDraft; baseline: CategoryDraft; itemIds: string[]; baselineItemIds: string[] };
type ArchiveTarget = { id: string; kind: "category" | "subcategory"; name: string };

const emptyDraft: CategoryDraft = {
  name: "",
  slug: "",
  description: "",
  image_url: "",
  is_active: true,
  parent_id: "",
  sort_order: 0,
};
const noCategories: Category[] = [];
const noProducts: Product[] = [];

const slugify = (value: string) =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const sameIds = (a: string[], b: string[]) => a.length === b.length && [...a].sort().every((id, index) => id === [...b].sort()[index]);

export default function StoreCategoriesManager() {
  const [data, setData] = useState<StorePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [channel, setChannel] = useState<"all" | "visible" | "hidden">("all");
  const [view, setView] = useState<"hierarchy" | "list">("hierarchy");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set());
  const [itemQuery, setItemQuery] = useState("");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<ArchiveTarget | null>(null);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [itemsDialogOpen, setItemsDialogOpen] = useState(false);
  const [parentDialogOpen, setParentDialogOpen] = useState(false);
  const [parentQuery, setParentQuery] = useState("");
  const [parentCandidate, setParentCandidate] = useState("");
  const [discardOpen, setDiscardOpen] = useState(false);
  const [bulkArchiveOpen, setBulkArchiveOpen] = useState(false);
  const [pendingImage, setPendingImage] = useState<{ file: File; preview: string } | null>(null);
  const [imageCandidate, setImageCandidate] = useState<{ file: File; preview: string } | null>(null);
  const [selectedLibraryAsset, setSelectedLibraryAsset] = useState<MediaAsset | null>(null);
  const [mediaLibrary, setMediaLibrary] = useState<MediaAsset[]>([]);
  const [mediaLibraryLoading, setMediaLibraryLoading] = useState(false);
  const [mediaLibraryQuery, setMediaLibraryQuery] = useState("");
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/studio/store", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Categories could not be loaded.");
      setData(result as StorePayload);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Categories could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let current = true;
    fetch("/api/studio/store", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Categories could not be loaded.");
        if (current) {
          setData(result as StorePayload);
          setError("");
        }
      })
      .catch((cause: unknown) => {
        if (current) setError(cause instanceof Error ? cause.message : "Categories could not be loaded.");
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => { current = false; };
  }, []);

  const categories = data?.categories ?? noCategories;
  const products = data?.products ?? noProducts;
  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return categories.flatMap((category) => {
      const children = category.store_subcategories ?? [];
      const categoryMatches = !needle || category.name.toLowerCase().includes(needle);
      const matchingChildren = children.filter((child) => !needle || child.name.toLowerCase().includes(needle));
      const channelMatches = (item: Category | Subcategory) => channel === "all" || (channel === "visible" ? item.is_active : !item.is_active);
      const parentRow = { kind: "category" as const, item: category, parent: null };
      const childRows = matchingChildren.map((item) => ({ kind: "subcategory" as const, item, parent: category })).filter(({ item }) => channelMatches(item));
      if (view === "list") return [...(categoryMatches && channelMatches(category) ? [parentRow] : []), ...childRows];
      if (needle) return categoryMatches || matchingChildren.length ? [...(channelMatches(category) ? [parentRow] : []), ...childRows] : [];
      return channelMatches(category) ? [parentRow, ...(expandedIds.has(category.id) ? childRows : [])] : [];
    });
  }, [categories, channel, expandedIds, query, view]);

  const visibleKeys = rows.map(({ kind, item }) => `${kind}:${item.id}`);
  const allVisibleSelected = visibleKeys.length > 0 && visibleKeys.every((key) => selectedKeys.has(key));

  function toggleExpanded(categoryId: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(categoryId)) next.delete(categoryId); else next.add(categoryId);
      return next;
    });
  }

  function toggleSelected(key: string) {
    setSelectedKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedKeys((current) => {
      const next = new Set(current);
      if (allVisibleSelected) visibleKeys.forEach((key) => next.delete(key)); else visibleKeys.forEach((key) => next.add(key));
      return next;
    });
  }

  function openCategory(category?: Category) {
    setError("");
    const draft = category
      ? { name: category.name, slug: category.slug, description: category.description, image_url: category.image_url, is_active: category.is_active, parent_id: "", sort_order: 0 }
      : { ...emptyDraft };
    const itemIds = category ? products.filter((product) => product.category_id === category.id).map((product) => product.id) : [];
    setEditor({
      id: category?.id,
      originalKind: category ? "category" : undefined,
      draft,
      baseline: { ...draft },
      itemIds,
      baselineItemIds: [...itemIds],
    });
    setPendingImage(null);
  }

  function openSubcategory(subcategory: Subcategory) {
    setError("");
    const draft = { name: subcategory.name, slug: subcategory.slug, description: subcategory.description, image_url: subcategory.image_url, is_active: subcategory.is_active, parent_id: subcategory.category_id, sort_order: subcategory.sort_order };
    const itemIds = products.filter((product) => product.subcategory_id === subcategory.id).map((product) => product.id);
    setEditor({
      id: subcategory.id,
      originalKind: "subcategory",
      draft,
      baseline: { ...draft },
      itemIds,
      baselineItemIds: [...itemIds],
    });
    setPendingImage(null);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor || busy) return;
    setBusy(true);
    setError("");
    const kind = editor.draft.parent_id ? "subcategory" : "category";
    try {
      if (editor.id && editor.originalKind !== kind) {
        throw new Error("A saved category cannot change between parent and subcategory. Duplicate it instead.");
      }
      let imageUrl = editor.draft.image_url;
      if (pendingImage) {
        const form = new FormData();
        form.set("file", pendingImage.file);
        const uploadResponse = await fetch("/api/studio/store/category-media", { method: "POST", body: form });
        const uploadResult = await uploadResponse.json();
        if (!uploadResponse.ok) throw new Error(uploadResult.error || "The category image could not be uploaded.");
        imageUrl = uploadResult.publicUrl;
      }
      const response = await fetch("/api/studio/store", {
        method: editor.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity: kind,
          ...(editor.id ? { id: editor.id } : {}),
          data: kind === "subcategory"
            ? { ...editor.draft, image_url: imageUrl, category_id: editor.draft.parent_id }
            : { ...editor.draft, image_url: imageUrl },
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The category could not be saved.");
      const savedId = editor.id || result.id;
      const categoryId = kind === "subcategory" ? editor.draft.parent_id : savedId;
      const assignmentResponse = await fetch("/api/studio/store", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity: "category_items", id: categoryId, subcategory_id: kind === "subcategory" ? savedId : null, product_ids: editor.itemIds }),
      });
      const assignmentResult = await assignmentResponse.json();
      if (!assignmentResponse.ok) throw new Error(assignmentResult.error || "The items could not be assigned.");
      setToast(`${editor.draft.name} has been ${editor.id ? "updated" : "created"}.`);
      setEditor(null);
      setPendingImage(null);
      await load();
      window.setTimeout(() => setToast(""), 4000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The category could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function archive() {
    if (!archiveTarget || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/studio/store", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity: archiveTarget.kind, id: archiveTarget.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The category could not be archived.");
      setArchiveTarget(null);
      setEditor(null);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The category could not be archived.");
    } finally {
      setBusy(false);
    }
  }

  async function archiveSelected() {
    if (!selectedKeys.size || busy) return;
    setBusy(true);
    setError("");
    try {
      for (const key of selectedKeys) {
        const [kind, id] = key.split(":") as ["category" | "subcategory", string];
        const response = await fetch("/api/studio/store", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entity: kind, id }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "The selected categories could not be archived.");
      }
      const archivedCount = selectedKeys.size;
      setSelectedKeys(new Set());
      setBulkArchiveOpen(false);
      setToast(`${archivedCount} ${archivedCount === 1 ? "category" : "categories"} archived.`);
      await load();
      window.setTimeout(() => setToast(""), 4000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The selected categories could not be archived.");
    } finally {
      setBusy(false);
    }
  }

  function duplicateCurrent() {
    if (!editor) return;
    const name = `${editor.draft.name} copy`;
    const draft = { ...editor.draft, name, slug: slugify(name) };
    setEditor({ draft, baseline: { ...draft }, itemIds: [...editor.itemIds], baselineItemIds: [...editor.itemIds] });
  }

  function duplicateRow(kind: "category" | "subcategory", item: Category | Subcategory) {
    const name = `${item.name} copy`;
    setError("");
    const draft = {
        name,
        slug: slugify(name),
        description: item.description,
        image_url: item.image_url,
        is_active: item.is_active,
        parent_id: kind === "subcategory" ? (item as Subcategory).category_id : "",
        sort_order: kind === "subcategory" ? (item as Subcategory).sort_order : 0,
      };
    const itemIds = products.filter((product) => kind === "category" ? product.category_id === item.id : product.subcategory_id === item.id).map((product) => product.id);
    setEditor({ draft, baseline: { ...draft }, itemIds, baselineItemIds: [...itemIds] });
    setPendingImage(null);
  }

  const editorDirty = Boolean(editor && (JSON.stringify(editor.draft) !== JSON.stringify(editor.baseline) || !sameIds(editor.itemIds, editor.baselineItemIds) || pendingImage));

  function requestCloseEditor() {
    if (busy) return;
    if (editorDirty) setDiscardOpen(true);
    else setEditor(null);
  }

  function chooseImage(file?: File) {
    if (!file) return;
    if (!file.type.match(/^image\/(jpeg|png|webp)$/) || file.size > 10 * 1024 * 1024) {
      setError("Use a JPEG, PNG, or WebP image up to 10 MB.");
      return;
    }
    setImageCandidate({ file, preview: URL.createObjectURL(file) });
    setSelectedLibraryAsset(null);
  }

  const loadMediaLibrary = useCallback(async () => {
    setMediaLibraryLoading(true);
    try {
      const response = await fetch("/api/studio/store/media-library", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The image library could not be loaded.");
      setMediaLibrary((result.assets || []) as MediaAsset[]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The image library could not be loaded.");
    } finally {
      setMediaLibraryLoading(false);
    }
  }, []);

  function openImageLibrary() {
    setImageDialogOpen(true);
    setImageCandidate(null);
    setSelectedLibraryAsset(null);
    setMediaLibraryQuery("");
    void loadMediaLibrary();
  }

  function applyImage() {
    if (selectedLibraryAsset) {
      if (editor) setEditor({ ...editor, draft: { ...editor.draft, image_url: selectedLibraryAsset.url } });
      setPendingImage(null);
    } else if (imageCandidate) {
      setPendingImage(imageCandidate);
    } else return;
    setImageCandidate(null);
    setSelectedLibraryAsset(null);
    setImageDialogOpen(false);
  }

  function openParentDialog() {
    if (!editor) return;
    setParentCandidate(editor.draft.parent_id);
    setParentQuery("");
    setParentDialogOpen(true);
  }

  function applyParentCategory() {
    if (!editor) return;
    setEditor({ ...editor, draft: { ...editor.draft, parent_id: parentCandidate } });
    setParentDialogOpen(false);
  }

  return (
    <main className="w-full pb-16">
      <div className="flex items-center justify-between gap-4 pb-7 pt-5">
        <h1 className="text-[28px] font-semibold tracking-[-0.035em]">Categories</h1>
        <button type="button" onClick={() => openCategory()} disabled={!data?.configured} className="h-12 rounded-full bg-[#111] px-6 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-40">
          Create category
        </button>
      </div>

      {error && !editor && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="mb-7 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <label className="flex h-12 w-[254px] items-center gap-3 rounded-full border border-[#d8d8d8] bg-white px-5 text-[#666] focus-within:border-[#111]">
            <IconSearch size={20} stroke={1.8} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" className="min-w-0 flex-1 bg-transparent text-sm text-[#111] outline-none placeholder:text-[#777]" />
          </label>
          <DropdownMenu><DropdownMenuTrigger render={<button type="button" className="flex h-12 items-center gap-2 rounded-xl border border-[#d8d8d8] bg-white px-5 text-sm font-medium text-[#444] hover:bg-[#f7f7f7]">{channel === "all" ? "Channel" : channel === "visible" ? "Visible" : "Hidden"}<IconChevronDown size={16} /></button>} /><DropdownMenuContent align="start"><DropdownMenuItem onClick={() => setChannel("all")}>All categories</DropdownMenuItem><DropdownMenuItem onClick={() => setChannel("visible")}>Visible on point of sale</DropdownMenuItem><DropdownMenuItem onClick={() => setChannel("hidden")}>Hidden</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
        </div>
        <div className="flex rounded-full bg-[#f1f1f1] p-1">
          <button type="button" aria-label="Hierarchy view" aria-pressed={view === "hierarchy"} onClick={() => setView("hierarchy")} className={`grid size-11 place-items-center rounded-full transition ${view === "hierarchy" ? "bg-white shadow-sm" : "text-[#555] hover:bg-white/60"}`}><IconHierarchy3 size={21} /></button>
          <button type="button" aria-label="List view" aria-pressed={view === "list"} onClick={() => setView("list")} className={`grid size-11 place-items-center rounded-full transition ${view === "list" ? "bg-white shadow-sm" : "text-[#555] hover:bg-white/60"}`}><IconList size={20} /></button>
        </div>
      </div>

      {selectedKeys.size > 0 && <div className="mb-4 flex min-h-14 items-center gap-3 rounded-xl bg-[#f3f3f3] px-4"><strong className="text-sm">{selectedKeys.size} selected</strong><button type="button" onClick={() => setSelectedKeys(new Set())} className="text-sm font-semibold underline underline-offset-2">Clear selection</button><button type="button" onClick={() => setBulkArchiveOpen(true)} className="ml-auto h-10 rounded-full border border-[#bbb] bg-white px-5 text-sm font-semibold transition hover:bg-[#fafafa]">Archive</button></div>}

      <div className="overflow-hidden border-y border-[#dedede] bg-white">
        <div className="grid grid-cols-[44px_minmax(0,1fr)_120px_44px] items-center border-b border-[#aaa] px-2 py-3 text-sm font-semibold">
          <input type="checkbox" aria-label="Select all categories" checked={allVisibleSelected} onChange={toggleSelectAll} className="size-5 rounded border-[#888] accent-[#111]" />
          <span>Name</span><span className="text-center">Items</span><span />
        </div>
        {loading ? (
          <div className="space-y-1 py-3">{[0, 1, 2].map((row) => <div key={row} className="h-16 animate-pulse rounded-lg bg-[#f5f5f5]" />)}</div>
        ) : rows.length ? rows.map(({ kind, item, parent }) => {
          const count = products.filter((product) => kind === "category" ? product.category_id === item.id : product.subcategory_id === item.id).length;
          return (
            <div key={`${kind}-${item.id}`} className="group grid min-h-16 grid-cols-[44px_minmax(0,1fr)_120px_44px] items-center border-b border-[#ededed] px-2 last:border-b-0 hover:bg-[#fafafa]">
              <input type="checkbox" aria-label={`Select ${item.name}`} checked={selectedKeys.has(`${kind}:${item.id}`)} onChange={() => toggleSelected(`${kind}:${item.id}`)} className="size-5 rounded border-[#888] accent-[#111]" />
              <div className={`flex min-w-0 items-center ${kind === "subcategory" ? "pl-10" : ""}`}>
                {kind === "category" && view === "hierarchy" && ((item as Category).store_subcategories?.length ?? 0) > 0 ? <button type="button" aria-label={`${expandedIds.has(item.id) ? "Collapse" : "Expand"} ${item.name}`} onClick={() => toggleExpanded(item.id)} className="mr-2 grid size-8 shrink-0 place-items-center rounded-full text-[#555] hover:bg-[#eee]"><IconChevronRight size={18} className={`transition-transform ${expandedIds.has(item.id) ? "rotate-90" : ""}`} /></button> : kind === "category" && view === "hierarchy" ? <span className="mr-2 size-8 shrink-0" /> : null}
              <button type="button" onClick={() => kind === "category" ? openCategory(item as Category) : openSubcategory(item as Subcategory)} className="flex min-w-0 flex-1 items-center gap-3 py-3 text-left">
                <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-md bg-[#f0f0f0] text-[#555]">
                  {item.image_url ? <img src={item.image_url} alt="" className="size-full object-cover" /> : <IconPhoto size={19} stroke={1.6} />}{/* eslint-disable-line @next/next/no-img-element */}
                </span>
                <span className="min-w-0">
                  <strong className="block truncate text-sm font-medium text-[#151515]">{item.name}</strong>
                  <small className="block truncate text-xs text-[#737373]">{kind === "subcategory" ? `Under ${parent?.name}` : (item.is_active ? "Visible on point of sale" : "Hidden")}</small>
                </span>
              </button>
              </div>
              <span className="text-center text-sm text-[#333]">{count}</span>
              <DropdownMenu>
                <DropdownMenuTrigger render={<button type="button" aria-label={`Actions for ${item.name}`} className="grid size-9 place-items-center rounded-full opacity-0 hover:bg-[#ececec] group-hover:opacity-100 focus:opacity-100"><IconDots size={19} /></button>} />
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => kind === "category" ? openCategory(item as Category) : openSubcategory(item as Subcategory)}>Edit</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => duplicateRow(kind, item)}>Duplicate</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => setArchiveTarget({ id: item.id, kind, name: item.name })}>Archive</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        }) : (
          <div className="grid min-h-[375px] place-items-center rounded-xl border border-[#ddd] px-6 text-center"><div><IconFolder size={72} stroke={1.4} className="mx-auto mb-7 text-[#bbb]" /><h2 className="text-2xl font-semibold">{query || channel !== "all" ? "No categories found" : "Item categories"}</h2><p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-[#555]">{query || channel !== "all" ? "Try a different search or channel filter." : "Categories help organize your items, determine how customers navigate your storefront, and report on item sales."}</p>{!query && channel === "all" && <button type="button" onClick={() => openCategory()} className="mt-5 h-12 rounded-full bg-[#111] px-6 text-sm font-semibold text-white">Create category</button>}</div></div>
        )}
      </div>

      {editor && createPortal(
        <div className="fixed inset-0 overflow-y-auto bg-white text-[#111]" style={{ zIndex: 2147483647 }}>
          <button type="button" aria-label="Close category editor" onClick={requestCloseEditor} className="fixed left-8 top-5 z-10 grid size-12 place-items-center rounded-full bg-[#f3f3f3] transition hover:bg-[#e7e7e7]"><IconX size={22} /></button>
          <div className="fixed right-8 top-5 z-10 flex items-center gap-2">
            {editor.id && (
              <DropdownMenu>
                <DropdownMenuTrigger render={<button type="button" aria-label="Category actions" className="grid size-12 place-items-center rounded-full bg-[#f3f3f3] hover:bg-[#e7e7e7]"><IconDots size={21} /></button>} />
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={duplicateCurrent}>Duplicate</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => { setArchiveTarget({ id: editor.id!, kind: editor.originalKind!, name: editor.draft.name }); setEditor(null); }}>Archive</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <button type="submit" form="category-editor-form" disabled={busy || !editor.draft.name.trim()} className="h-12 rounded-full bg-[#111] px-6 text-sm font-semibold text-white hover:bg-black disabled:opacity-40">{busy ? "Saving…" : "Save"}</button>
          </div>

          <form id="category-editor-form" onSubmit={save} className="mx-auto w-full max-w-[600px] px-6 pb-20 pt-24">
            <h2 className="mb-6 text-[26px] font-semibold tracking-[-0.035em]">{editor.id ? "Edit category" : "Create category"}</h2>
            <label className="block">
              <span className="sr-only">Category name</span>
              <input autoFocus required maxLength={100} value={editor.draft.name} onChange={(event) => { const name = event.target.value; setEditor({ ...editor, draft: { ...editor.draft, name, slug: editor.id ? editor.draft.slug : slugify(name) } }); }} placeholder="Category name" className="h-16 w-full rounded-lg border border-[#d5d5d5] px-4 text-base outline-none transition focus:border-[#111] focus:ring-1 focus:ring-[#111]" />
            </label>

            <div className="mt-4 rounded-lg border border-dashed border-[#cfcfcf] p-4">
              <button type="button" onClick={openImageLibrary} className="flex min-h-16 w-full items-center justify-center gap-2 text-sm">
                <IconPhoto size={21} />
                <span>Drag an image here, <span className="font-semibold underline">upload</span> or <span className="font-semibold underline">browse image library</span>{(pendingImage || editor.draft.image_url) ? " to replace the image" : ""}.</span>
              </button>
              {(pendingImage || editor.draft.image_url) && (
                <div className="mt-2 flex items-center gap-3">
                  <img src={pendingImage?.preview || editor.draft.image_url} alt="Category preview" className="size-16 rounded-md border border-[#ddd] object-cover" />{/* eslint-disable-line @next/next/no-img-element */}
                  <div className="min-w-0"><p className="truncate text-sm font-medium">{pendingImage?.file.name || "Current category image"}</p><button type="button" onClick={() => { setPendingImage(null); setEditor({ ...editor, draft: { ...editor.draft, image_url: "" } }); }} className="mt-1 text-xs font-semibold underline">Remove</button></div>
                </div>
              )}
            </div>

            <section className="border-b-[7px] border-[#f1f1f1] py-5">
              <div className="flex items-start gap-4"><IconHierarchy3 className="mt-1 shrink-0" size={23} /><div className="flex-1"><h3 className="text-sm font-semibold">Parent category</h3><p className="mt-1 text-sm text-[#717171]">Select a parent category to make this a subcategory.</p></div>
                <button type="button" onClick={openParentDialog} disabled={Boolean(editor.id && editor.originalKind === "category")} className="max-w-48 truncate text-right text-sm font-semibold underline underline-offset-2 disabled:no-underline disabled:text-[#999]">
                  {editor.draft.parent_id ? categories.find((category) => category.id === editor.draft.parent_id)?.name || "Select" : "Select"}
                </button>
              </div>
            </section>

            <section className="border-b-[7px] border-[#f1f1f1] py-6">
              <h3 className="mb-5 text-xl font-semibold">Items</h3>
              <div className="flex items-center gap-4"><IconTag size={23} /><div className="flex-1"><h4 className="text-sm font-semibold">Items</h4><p className="mt-1 text-sm text-[#717171]">{editor.itemIds.length ? `${editor.itemIds.length} selected` : "None selected"}</p></div><button type="button" onClick={() => setItemsDialogOpen(true)} className="text-sm font-semibold underline">Add</button></div>
            </section>

            <section className="border-b-[7px] border-[#f1f1f1] py-6">
              <h3 className="mb-5 text-xl font-semibold">Details</h3>
              <label className="block text-sm font-semibold">URL slug<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={editor.draft.slug} onChange={(event) => setEditor({ ...editor, draft: { ...editor.draft, slug: event.target.value } })} className="mt-2 h-12 w-full rounded-lg border border-[#d5d5d5] px-4 font-normal outline-none focus:border-[#111]" /></label>
              <label className="mt-4 block text-sm font-semibold">Description<textarea rows={3} value={editor.draft.description} onChange={(event) => setEditor({ ...editor, draft: { ...editor.draft, description: event.target.value } })} placeholder="Optional description" className="mt-2 w-full resize-none rounded-lg border border-[#d5d5d5] p-4 font-normal outline-none focus:border-[#111]" /></label>
            </section>

            <section className="py-6">
              <h3 className="mb-5 text-xl font-semibold">Sales channels and hours</h3>
              <div className="flex items-center gap-4"><IconTag size={23} /><div className="flex-1"><h4 className="text-sm font-semibold">Points of sale</h4><p className="mt-1 text-sm text-[#717171]">Categories appear in the storefront and catalog when enabled.</p></div>
                <button type="button" role="switch" aria-checked={editor.draft.is_active} onClick={() => setEditor({ ...editor, draft: { ...editor.draft, is_active: !editor.draft.is_active } })} className={`relative h-7 w-12 rounded-full transition ${editor.draft.is_active ? "bg-[#111]" : "bg-[#bbb]"}`}><span className={`absolute top-1 size-5 rounded-full bg-white transition ${editor.draft.is_active ? "left-6" : "left-1"}`} /></button>
              </div>
            </section>
            {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          </form>

          {imageDialogOpen && (
            <div className="fixed inset-0 z-20 grid place-items-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-labelledby="image-library-title">
              <section className="w-full max-w-[750px] overflow-hidden rounded-xl bg-white shadow-2xl">
                <header className="relative border-b border-[#e5e5e5] px-6 py-6 text-center"><button type="button" aria-label="Close image library" onClick={() => { setImageDialogOpen(false); setImageCandidate(null); setSelectedLibraryAsset(null); }} className="absolute left-4 top-3 grid size-12 place-items-center rounded-full bg-[#f3f3f3] hover:bg-[#e7e7e7]"><IconX size={22} /></button><h2 id="image-library-title" className="text-2xl font-semibold">Image library</h2></header>
                <div className="space-y-6 p-6 sm:p-8">
                  <label onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); chooseImage(event.dataTransfer.files?.[0]); }} className="grid min-h-[220px] cursor-pointer place-items-center border border-dashed border-[#cfcfcf] text-center">
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => chooseImage(event.target.files?.[0])} />
                    {imageCandidate ? <div><img src={imageCandidate.preview} alt="Selected upload" className="mx-auto max-h-56 max-w-full rounded-lg object-contain" />{/* eslint-disable-line @next/next/no-img-element */}<p className="mt-3 text-sm font-medium">{imageCandidate.file.name}</p></div> : <div><IconPhoto size={26} className="mx-auto mb-8 text-[#aaa]" /><p className="text-lg font-semibold">Drag and drop images here, or</p><span className="mt-4 inline-flex h-12 items-center rounded-full bg-[#111] px-6 text-sm font-semibold text-white"><IconUpload size={18} className="mr-2" />Upload</span><p className="mt-3 text-xs text-[#777]">JPEG, PNG, or WebP · up to 10 MB</p></div>}
                  </label>
                  <section aria-labelledby="storage-library-title">
                    <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                      <div><h3 id="storage-library-title" className="text-sm font-semibold">Supabase Storage library</h3><p className="mt-1 text-xs text-[#777]">Reuse an existing product-media asset without uploading it again.</p></div>
                      <label className="flex h-10 min-w-48 items-center gap-2 rounded-full border border-[#d5d5d5] px-3"><IconSearch size={16} className="shrink-0 text-[#777]" /><span className="sr-only">Search media library</span><input value={mediaLibraryQuery} onChange={(event) => setMediaLibraryQuery(event.target.value)} placeholder="Search assets" className="min-w-0 flex-1 bg-transparent text-xs outline-none" /></label>
                    </div>
                    {mediaLibraryLoading ? <p className="rounded-lg bg-[#f6f6f6] px-4 py-8 text-center text-sm text-[#666]">Loading Storage assets…</p> : mediaLibrary.filter((asset) => `${asset.name} ${asset.path}`.toLowerCase().includes(mediaLibraryQuery.trim().toLowerCase())).length ? <div className="grid max-h-64 grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3">{mediaLibrary.filter((asset) => `${asset.name} ${asset.path}`.toLowerCase().includes(mediaLibraryQuery.trim().toLowerCase())).map((asset) => { const selected = selectedLibraryAsset?.path === asset.path; return <button key={asset.path} type="button" aria-label={`Select ${asset.name}`} aria-pressed={selected} onClick={() => { setSelectedLibraryAsset(asset); setImageCandidate(null); }} className={`overflow-hidden rounded-lg border text-left transition ${selected ? "border-[#111] ring-2 ring-[#111]" : "border-[#e2e2e2] hover:border-[#999]"}`}><img src={asset.url} alt="" className="aspect-square w-full bg-[#f3f3f3] object-cover" />{/* eslint-disable-line @next/next/no-img-element */}<span className="block truncate px-2 py-2 text-[11px] font-medium">{asset.name}</span><span className="block truncate px-2 pb-2 text-[10px] text-[#777]">{asset.folder}</span></button>; })}</div> : <p className="rounded-lg bg-[#f6f6f6] px-4 py-8 text-center text-sm text-[#666]">No reusable Storage images found.</p>}
                  </section>
                </div>
                <footer className="flex justify-end border-t border-[#e5e5e5] px-5 py-4"><button type="button" onClick={applyImage} disabled={!imageCandidate && !selectedLibraryAsset} className="h-12 rounded-full bg-[#111] px-6 text-sm font-semibold text-white disabled:bg-[#ddd] disabled:text-[#888]">Use selected image</button></footer>
              </section>
            </div>
          )}

          {itemsDialogOpen && (
            <div className="fixed inset-0 z-20 grid place-items-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-labelledby="assign-items-title">
              <section className="w-full max-w-[670px] overflow-hidden rounded-xl bg-white shadow-2xl">
                <header className="relative px-8 pb-4 pt-7"><button type="button" aria-label="Close item assignment" onClick={() => setItemsDialogOpen(false)} className="absolute left-5 top-5 grid size-12 place-items-center rounded-full bg-[#f3f3f3]"><IconX size={22} /></button><button type="button" onClick={() => setItemsDialogOpen(false)} className="absolute right-6 top-5 h-12 rounded-full bg-[#111] px-6 text-sm font-semibold text-white">Assign items</button><h2 id="assign-items-title" className="mt-16 text-2xl font-semibold">Assign items</h2><p className="mt-3 text-sm text-[#555]">Select the catalog items that belong in this category.</p></header>
                <div className="max-h-[430px] overflow-y-auto px-8 pb-8">
                  <label className="mb-4 flex h-12 items-center gap-3 rounded-full border border-[#d5d5d5] px-4"><IconSearch size={19} /><input value={itemQuery} onChange={(event) => setItemQuery(event.target.value)} placeholder="Search items" className="flex-1 bg-transparent text-sm outline-none" /></label>
                  <div className="border-t border-[#aaa]">
                    {products.length ? products.filter((product) => product.title.toLowerCase().includes(itemQuery.trim().toLowerCase())).map((product) => {
                      const checked = editor.itemIds.includes(product.id);
                      return <label key={product.id} className="flex cursor-pointer items-center gap-3 border-b border-[#ededed] py-3"><input type="checkbox" checked={checked} onChange={() => setEditor({ ...editor, itemIds: checked ? editor.itemIds.filter((id) => id !== product.id) : [...editor.itemIds, product.id] })} className="size-5" /><span className="grid size-10 place-items-center overflow-hidden rounded-md bg-[#f1f1f1]">{product.image_url ? <img src={product.image_url} alt="" className="size-full object-cover" /> : <IconTag size={18} />}{/* eslint-disable-line @next/next/no-img-element */}</span><span className="flex-1 text-sm font-medium">{product.title}</span>{checked && <IconSquareCheck size={20} />}</label>;
                    }) : <div className="py-12 text-center"><IconFolder size={30} className="mx-auto text-[#aaa]" /><p className="mt-4 font-semibold">Create an item to get started.</p></div>}
                  </div>
                </div>
              </section>
            </div>
          )}

          {parentDialogOpen && (
            <div className="fixed inset-0 z-20 grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="parent-category-title">
              <section className="flex max-h-[min(690px,calc(100vh-32px))] w-full max-w-[620px] flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
                <header className="relative shrink-0 px-8 pb-3 pt-7">
                  <button type="button" aria-label="Close parent category" onClick={() => setParentDialogOpen(false)} className="absolute left-5 top-5 grid size-12 place-items-center rounded-full bg-[#f3f3f3] transition hover:bg-[#e7e7e7]"><IconX size={22} /></button>
                  <button type="button" onClick={applyParentCategory} className="absolute right-6 top-5 h-12 rounded-full bg-[#111] px-6 text-sm font-semibold text-white transition hover:bg-black">Done</button>
                  <h2 id="parent-category-title" className="mt-16 text-[26px] font-semibold tracking-[-0.03em]">Parent category</h2>
                  <p className="mt-2 text-sm leading-6 text-[#666]">Select a parent category to nest this category underneath it.</p>
                </header>
                <div className="min-h-0 overflow-y-auto px-8 pb-8 pt-3">
                  <label className="mb-4 flex h-12 items-center gap-3 rounded-lg border border-[#cfcfcf] px-4 transition focus-within:border-[#111] focus-within:ring-1 focus-within:ring-[#111]">
                    <IconSearch size={19} className="shrink-0 text-[#555]" />
                    <input autoFocus value={parentQuery} onChange={(event) => setParentQuery(event.target.value)} placeholder="Search" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#777]" />
                  </label>
                  <div role="radiogroup" aria-label="Available parent categories" className="border-t border-[#999]">
                    <button type="button" role="radio" aria-checked={!parentCandidate} onClick={() => setParentCandidate("")} className="flex min-h-16 w-full items-center gap-3 border-b border-[#e4e4e4] px-1 text-left transition hover:bg-[#fafafa]">
                      <span className="grid size-10 shrink-0 place-items-center rounded-md bg-[#f1f1f1]"><IconFolder size={20} stroke={1.6} /></span>
                      <span className="flex-1 text-sm font-medium">None</span>
                      <span className={`grid size-6 place-items-center rounded-full border-2 ${!parentCandidate ? "border-[#111] bg-[#111] text-white" : "border-[#aaa]"}`}>{!parentCandidate && <IconCheck size={15} stroke={3} />}</span>
                    </button>
                    {categories.filter((category) => category.id !== editor.id && category.name.toLowerCase().includes(parentQuery.trim().toLowerCase())).map((category) => {
                      const selected = parentCandidate === category.id;
                      const childCount = category.store_subcategories?.length ?? 0;
                      const itemCount = products.filter((product) => product.category_id === category.id).length;
                      return (
                        <button key={category.id} type="button" role="radio" aria-checked={selected} onClick={() => setParentCandidate(category.id)} className="flex min-h-[68px] w-full items-center gap-3 border-b border-[#e4e4e4] px-1 text-left transition hover:bg-[#fafafa]">
                          {childCount > 0 ? <IconChevronRight size={18} className="shrink-0 text-[#666]" /> : <span className="w-[18px]" />}
                          <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-md bg-[#f1f1f1] text-[#555]">{category.image_url ? <img src={category.image_url} alt="" className="size-full object-cover" /> : <IconFolder size={20} stroke={1.6} />}{/* eslint-disable-line @next/next/no-img-element */}</span>
                          <span className="min-w-0 flex-1"><strong className="block truncate text-sm font-medium">{category.name}</strong><small className="mt-0.5 block text-xs text-[#777]">{itemCount} {itemCount === 1 ? "item" : "items"}{childCount ? ` · ${childCount} subcategories` : ""}</small></span>
                          <span className={`grid size-6 shrink-0 place-items-center rounded-full border-2 ${selected ? "border-[#111] bg-[#111] text-white" : "border-[#aaa]"}`}>{selected && <IconCheck size={15} stroke={3} />}</span>
                        </button>
                      );
                    })}
                    {categories.filter((category) => category.id !== editor.id && category.name.toLowerCase().includes(parentQuery.trim().toLowerCase())).length === 0 && <div className="py-12 text-center"><IconFolder size={30} className="mx-auto text-[#aaa]" /><p className="mt-3 text-sm font-semibold">No categories found</p><p className="mt-1 text-xs text-[#777]">Try a different search.</p></div>}
                  </div>
                </div>
              </section>
            </div>
          )}

          {discardOpen && (
            <div className="fixed inset-0 z-30 grid place-items-center bg-black/80 p-4" role="alertdialog" aria-modal="true" aria-labelledby="discard-title">
              <section className="w-full max-w-[420px] rounded-xl bg-white p-6 shadow-2xl"><h2 id="discard-title" className="text-xl font-semibold">Discard your changes?</h2><p className="mt-2 text-sm leading-6 text-[#666]">If you leave now, the changes you made to this category won’t be saved.</p><div className="mt-7 flex justify-end gap-3"><button type="button" onClick={() => setDiscardOpen(false)} className="h-11 rounded-full border border-[#ccc] px-5 text-sm font-semibold">Keep editing</button><button type="button" onClick={() => { setDiscardOpen(false); setEditor(null); setPendingImage(null); }} className="h-11 rounded-full bg-[#111] px-5 text-sm font-semibold text-white">Discard changes</button></div></section>
            </div>
          )}
        </div>,
        document.body,
      )}

      <AlertDialog open={Boolean(archiveTarget)} onOpenChange={(open) => !open && !busy && setArchiveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Archive “{archiveTarget?.name}”?</AlertDialogTitle><AlertDialogDescription>This removes it from the active storefront while keeping its history. You can restore it later by editing the database record.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={() => void archive()} className="bg-red-600 text-white hover:bg-red-700"><IconTrash size={16} /> {busy ? "Archiving…" : "Archive"}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={bulkArchiveOpen} onOpenChange={(open) => !open && !busy && setBulkArchiveOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Archive {selectedKeys.size} selected {selectedKeys.size === 1 ? "category" : "categories"}?</AlertDialogTitle><AlertDialogDescription>Selected categories will be removed from the active catalog. Products remain in your catalog and can be reassigned later.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={() => void archiveSelected()} className="bg-red-600 text-white hover:bg-red-700"><IconTrash size={16} /> {busy ? "Archiving…" : "Archive selected"}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {toast && createPortal(<div role="status" className="fixed bottom-7 left-1/2 z-[9999] flex min-w-80 -translate-x-1/2 items-center gap-3 rounded-xl bg-[#222] px-5 py-4 text-sm font-semibold text-white shadow-2xl"><IconSquareCheck size={20} className="text-emerald-400" />{toast}<button type="button" onClick={() => setToast("")} className="ml-auto"><IconX size={18} /></button></div>, document.body)}
    </main>
  );
}
