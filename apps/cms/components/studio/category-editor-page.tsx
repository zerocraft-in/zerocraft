"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { IconCheck, IconChevronRight, IconFolder, IconHierarchy3, IconPhoto, IconSearch, IconTag, IconX } from "@tabler/icons-react";
import { PageState } from "@/components/studio/page-state";

type Category = { id: string; name: string; slug: string; description: string; image_url: string; is_active: boolean; store_subcategories?: Array<{ id: string; name: string; is_active: boolean }> };
type Product = { id: string; title: string; image_url: string; category_id: string | null };
type MediaAsset = { path: string; name: string; url: string; mimeType: string; size: number };

const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function CategoryEditorPage({ categoryId }: { categoryId?: string }) {
  const router = useRouter();
  const editing = Boolean(categoryId);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryQuery, setLibraryQuery] = useState("");
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [parentId, setParentId] = useState("");
  const [parentOpen, setParentOpen] = useState(false);
  const [parentQuery, setParentQuery] = useState("");
  const [parentCandidate, setParentCandidate] = useState("");
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [itemsOpen, setItemsOpen] = useState(false);
  const [itemQuery, setItemQuery] = useState("");

  useEffect(() => {
    let mounted = true;
    fetch("/api/store", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Category data could not be loaded.");
        const found = categoryId ? (result.categories || []).find((item: Category) => item.id === categoryId) : null;
        if (categoryId && !found) throw new Error("That category could not be found.");
        if (!mounted) return;
        setCategories((result.categories || []) as Category[]);
        setProducts((result.products || []) as Product[]);
        if (found) {
          setName(found.name);
          setSlug(found.slug);
          setDescription(found.description || "");
          setImageUrl(found.image_url || "");
          setActive(found.is_active);
          setSelectedItemIds((result.products || []).filter((item: Product) => item.category_id === found.id).map((item: Product) => item.id));
        }
      })
      .catch((cause) => mounted && setError(cause instanceof Error ? cause.message : "Category data could not be loaded."))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [categoryId]);

  const filteredAssets = useMemo(() => {
    const query = libraryQuery.trim().toLowerCase();
    return assets.filter((asset) => !query || asset.name.toLowerCase().includes(query) || asset.path.toLowerCase().includes(query));
  }, [assets, libraryQuery]);

  const filteredParents = useMemo(() => {
    const query = parentQuery.trim().toLowerCase();
    return categories.filter((category) => category.id !== categoryId && (!query || category.name.toLowerCase().includes(query)));
  }, [categories, categoryId, parentQuery]);

  async function openLibrary() {
    setLibraryOpen(true);
    setLibraryQuery("");
    if (assets.length) return;
    setLibraryLoading(true);
    try {
      const response = await fetch("/api/store/media-library", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Media library could not be loaded.");
      setAssets((result.assets || []) as MediaAsset[]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Media library could not be loaded.");
    } finally {
      setLibraryLoading(false);
    }
  }

  async function save() {
    if (saving || !name.trim()) return;
    if (editing && parentId) {
      setError("An existing category cannot be converted into a subcategory. Create a new subcategory instead.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      let savedImageUrl = imageUrl;
      if (uploadFile) {
        const form = new FormData();
        form.set("file", uploadFile);
        const uploadResponse = await fetch("/api/store/category-media", { method: "POST", body: form });
        const uploadResult = await uploadResponse.json();
        if (!uploadResponse.ok) throw new Error(uploadResult.error || "Category image could not be uploaded.");
        savedImageUrl = uploadResult.publicUrl;
      }
      const response = await fetch("/api/store", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity: parentId ? "subcategory" : "category",
          ...(editing ? { id: categoryId } : {}),
          data: parentId
            ? { name: name.trim(), slug: slug.trim() || slugify(name), description, image_url: savedImageUrl, is_active: active, category_id: parentId }
            : { name: name.trim(), slug: slug.trim() || slugify(name), description, image_url: savedImageUrl, is_active: active },
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Category could not be saved.");
      const savedId = editing ? categoryId : result.id;
      const assignmentResponse = await fetch("/api/store", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entity: "category_items", id: parentId || savedId, subcategory_id: parentId ? savedId : null, product_ids: selectedItemIds }) });
      if (!assignmentResponse.ok) throw new Error("Category items could not be updated.");
      router.push("/store/categories");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Category could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main className="mx-auto w-full max-w-[1180px] px-6 py-10"><PageState kind="loading" title={editing ? "Loading category" : "Preparing category"} description="Fetching catalog data and editor settings." /></main>;

  return (
    <main className="min-h-screen w-full bg-background text-foreground">
      <header className="sticky top-0 z-10 flex h-[72px] items-center justify-between border-b border-border bg-background/95 px-6 backdrop-blur sm:px-8">
        <button type="button" onClick={() => router.push("/store/categories")} className="grid size-10 place-items-center rounded-full bg-muted text-foreground transition hover:bg-muted/70" aria-label="Close editor"><IconX size={19} /></button>
        <Button type="button" onClick={save} disabled={saving || !name.trim()} variant="secondary" className="rounded-full px-5">{saving ? "Saving…" : "Save"}</Button>
      </header>
      <div className="mx-auto w-full max-w-[620px] px-6 pb-24 pt-8 sm:px-8 sm:pt-10">
        <h1 className="text-[22px] font-semibold tracking-[-0.035em]">{editing ? "Edit category" : "Create category"}</h1>
        {error && <div role="alert" className="mt-7 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
        <div className="mt-6 space-y-5">
          <Input autoFocus value={name} maxLength={100} onChange={(event) => { setName(event.target.value); if (!editing) setSlug(slugify(event.target.value)); }} placeholder="Category name" className="h-14 border-2 text-sm" />
          <label className="flex min-h-[112px] cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/10 px-5 text-center text-sm text-muted-foreground transition hover:bg-muted/30"><IconPhoto size={17} />Drag an image here, <span className="font-medium text-foreground underline underline-offset-2">upload</span> or <button type="button" onClick={(event) => { event.preventDefault(); void openLibrary(); }} className="font-medium text-foreground underline underline-offset-2">browse image library</button><input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; if (!file.type.match(/^image\/(jpeg|png|webp)$/) || file.size > 10 * 1024 * 1024) { setError("Use a JPEG, PNG, or WebP image up to 10 MB."); return; } setUploadFile(file); setImageUrl(URL.createObjectURL(file)); }} /></label>
          {imageUrl && <div className="flex items-center gap-3 text-xs text-muted-foreground"><img src={imageUrl} alt="Category preview" className="size-12 rounded-md object-cover" /><span className="flex-1 truncate">{uploadFile?.name || "Selected library image"}</span><button type="button" onClick={() => { setImageUrl(""); setUploadFile(null); }} className="underline">Remove</button></div>}
          <button type="button" onClick={() => { setParentCandidate(parentId); setParentQuery(""); setParentOpen(true); }} className="flex w-full items-start gap-3 border-b pb-5 text-left"><IconHierarchy3 size={19} className="mt-0.5" /><span className="flex-1"><strong className="block text-sm">Parent category</strong><small className="mt-1 block text-xs text-muted-foreground">{parentId ? categories.find((category) => category.id === parentId)?.name || "Selected" : "Select a parent category to make this a subcategory."}</small></span><span className="text-xs font-semibold underline underline-offset-2">{parentId ? "Change" : "Select"}</span></button>
          <button type="button" onClick={() => setItemsOpen(true)} className="flex w-full items-start gap-3 border-b pb-5 text-left"><IconTag size={19} className="mt-0.5" /><span className="flex-1"><strong className="block text-sm">Items</strong><small className="mt-1 block text-xs text-muted-foreground">{selectedItemIds.length ? `${selectedItemIds.length} selected` : "None selected"}</small></span><span className="text-xs font-semibold underline underline-offset-2">Add</span></button>
          <section className="border-b border-border pb-6"><h2 className="mb-5 text-base font-semibold">Details</h2><label className="block text-sm font-medium">URL slug<Input value={slug} maxLength={100} onChange={(event) => setSlug(slugify(event.target.value))} placeholder="category-slug" className="mt-2 h-12 text-sm" /></label><label className="mt-5 block text-sm font-medium">Description<Textarea value={description} maxLength={500} onChange={(event) => setDescription(event.target.value)} placeholder="Optional description" rows={4} className="mt-2 resize-none text-sm" /></label></section>
          <section className="flex items-center gap-3 pb-5"><IconTag size={19} /><div className="flex-1"><strong className="block text-sm">Points of sale</strong><small className="mt-1 block text-xs text-muted-foreground">Categories appear in the storefront and catalog when enabled.</small></div><button type="button" role="switch" aria-checked={active} onClick={() => setActive((value) => !value)} className={`relative h-6 w-10 rounded-full transition ${active ? "bg-foreground" : "bg-muted-foreground/40"}`}><span className={`absolute top-1 size-4 rounded-full bg-background transition ${active ? "left-5" : "left-1"}`} /></button></section>
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground"><span>{name.trim() ? <><IconCheck size={14} className="mr-1 inline text-emerald-600" />Ready to save</> : "Add a category name to continue"}</span><span>{description.length}/500</span></div>
      </div>
      <Dialog open={parentOpen} onOpenChange={setParentOpen}>
        <DialogContent showCloseButton={false} className="max-h-[min(720px,90vh)] max-w-[520px] gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b px-5 py-5 pr-16">
            <DialogTitle className="text-lg">Parent category</DialogTitle>
            <DialogDescription>Select a parent category to nest this category underneath it.</DialogDescription>
            <DialogClose render={<Button variant="ghost" size="icon-sm" className="absolute top-4 left-4" />} aria-label="Close parent category picker"><IconX /></DialogClose>
          </DialogHeader>
          <div className="border-b p-4">
            <Input value={parentQuery} onChange={(event) => setParentQuery(event.target.value)} placeholder="Search categories..." aria-label="Search parent categories" autoFocus />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            <button type="button" onClick={() => setParentCandidate("")} className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-muted ${!parentCandidate ? "bg-muted" : ""}`}>
              <span className="grid size-9 place-items-center rounded-md bg-muted"><IconFolder size={17} /></span>
              <span className="flex-1"><strong className="block text-sm font-medium">None</strong><small className="text-xs text-muted-foreground">Create this as a top-level category</small></span>
              <span className={`grid size-5 place-items-center rounded-full border ${!parentCandidate ? "border-primary bg-primary text-primary-foreground" : "border-input"}`}>{!parentCandidate && <IconCheck size={13} />}</span>
            </button>
            <div className="my-1 border-t" />
            {filteredParents.length ? filteredParents.map((category) => {
              const selected = parentCandidate === category.id;
              const itemCount = products.filter((product) => product.category_id === category.id).length;
              const subcategoryCount = category.store_subcategories?.length || 0;
              return <button type="button" key={category.id} onClick={() => setParentCandidate(category.id)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-muted ${selected ? "bg-muted" : ""}`}>
                <IconChevronRight size={15} className="shrink-0 text-muted-foreground" />
                <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-md bg-muted">{category.image_url ? <img src={category.image_url} alt="" className="size-full object-cover" /> : <IconFolder size={17} />}</span>
                <span className="min-w-0 flex-1"><strong className="block truncate text-sm font-medium">{category.name}</strong><small className="block text-xs text-muted-foreground">{itemCount} {itemCount === 1 ? "item" : "items"}{subcategoryCount ? ` · ${subcategoryCount} subcategories` : ""}</small></span>
                <span className={`grid size-5 shrink-0 place-items-center rounded-full border ${selected ? "border-primary bg-primary text-primary-foreground" : "border-input"}`}>{selected && <IconCheck size={13} />}</span>
              </button>;
            }) : <div className="px-3 py-12 text-center text-sm text-muted-foreground">No categories found.</div>}
          </div>
          <DialogFooter className="m-0 rounded-none border-t bg-background p-4 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setParentOpen(false)}>Cancel</Button>
            <Button onClick={() => { setParentId(parentCandidate); setParentOpen(false); }}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {itemsOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="items-title"><section className="flex max-h-[min(680px,90vh)] w-full max-w-xl flex-col overflow-hidden rounded-xl border bg-card shadow-2xl"><header className="flex items-center justify-between border-b px-5 py-4"><div><h2 id="items-title" className="font-semibold">Add items</h2><p className="mt-1 text-xs text-muted-foreground">Choose products for this category.</p></div><button type="button" onClick={() => setItemsOpen(false)} className="grid size-9 place-items-center rounded-lg hover:bg-muted" aria-label="Close items"><IconX size={18} /></button></header><div className="border-b p-4"><label className="flex h-10 items-center gap-2 rounded-lg border px-3"><IconSearch size={16} className="text-muted-foreground" /><input value={itemQuery} onChange={(event) => setItemQuery(event.target.value)} placeholder="Search items…" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label></div><div className="min-h-0 flex-1 overflow-y-auto px-5">{products.filter((item) => item.title.toLowerCase().includes(itemQuery.trim().toLowerCase())).map((item) => { const checked = selectedItemIds.includes(item.id); return <label key={item.id} className="flex cursor-pointer items-center gap-3 border-b py-3"><input type="checkbox" checked={checked} onChange={() => setSelectedItemIds((current) => checked ? current.filter((id) => id !== item.id) : [...current, item.id])} className="size-4" /><span className="grid size-10 place-items-center overflow-hidden rounded-md bg-muted">{item.image_url ? <img src={item.image_url} alt="" className="size-full object-cover" /> : <IconTag size={17} />}</span><span className="flex-1 text-sm font-medium">{item.title}</span></label>; })}</div><footer className="flex justify-end border-t p-4"><button type="button" onClick={() => setItemsOpen(false)} className="h-10 rounded-lg bg-foreground px-5 text-sm font-semibold text-background">Done</button></footer></section></div>}
      {libraryOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="media-library-title"><section className="flex max-h-[min(720px,90vh)] w-full max-w-3xl flex-col overflow-hidden rounded-xl border bg-card shadow-2xl"><header className="flex items-center justify-between border-b px-5 py-4"><div><h2 id="media-library-title" className="font-semibold">Choose from media library</h2><p className="mt-1 text-xs text-muted-foreground">Select an existing catalog asset.</p></div><button type="button" onClick={() => setLibraryOpen(false)} className="grid size-9 place-items-center rounded-lg hover:bg-muted" aria-label="Close media library"><IconX size={18} /></button></header><div className="border-b p-4"><label className="flex h-10 items-center gap-2 rounded-lg border px-3"><IconSearch size={16} className="text-muted-foreground" /><input value={libraryQuery} onChange={(event) => setLibraryQuery(event.target.value)} placeholder="Search media…" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label></div><div className="min-h-0 flex-1 overflow-y-auto p-4">{libraryLoading ? <div className="py-20 text-center text-sm text-muted-foreground">Loading media…</div> : filteredAssets.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">{filteredAssets.map((asset) => <button type="button" key={asset.path} onClick={() => { setImageUrl(asset.url); setUploadFile(null); setLibraryOpen(false); }} className="group overflow-hidden rounded-lg border text-left transition hover:border-foreground hover:shadow-sm"><div className="aspect-square bg-muted"><img src={asset.url} alt={asset.name} className="size-full object-cover transition group-hover:scale-105" /></div><p className="truncate px-3 py-2 text-xs font-medium">{asset.name}</p></button>)}</div> : <div className="py-20 text-center text-sm text-muted-foreground">No media assets found.</div>}</div></section></div>}
    </main>
  );
}


