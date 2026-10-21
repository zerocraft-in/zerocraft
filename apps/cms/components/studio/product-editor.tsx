"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  IconArrowLeft,
  IconBox,
  IconChevronDown,
  IconDeviceFloppy,
  IconPhoto,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Variant = {
  id?: string;
  label: string;
  sku: string;
  options: Record<string, string>;
  price: number;
  stock: number | null;
  is_active: boolean;
};

type ProductDraft = {
  id?: string;
  write_version?: number;
  title: string;
  slug: string;
  description: string;
  category_id: string | null;
  subcategory_id: string | null;
  design_origin: "original_zerocraft" | "licensed" | "fan_inspired";
  rights_status: "not_applicable" | "approved_license" | "review_required";
  product_type: "physical" | "digital";
  status: "draft" | "active" | "archived";
  sku: string;
  price: number;
  compare_at_price: number | null;
  currency: string;
  stock: number | null;
  image_url: string;
  variants: Variant[];
};

type Category = {
  id: string;
  name: string;
  store_subcategories?: { id: string; name: string }[];
};

type StorePayload = {
  configured: boolean;
  catalogError: string | null;
  categories: Category[];
  products: Array<ProductDraft & { id: string; store_product_variants?: Variant[] }>;
};

const emptyProduct: ProductDraft = {
  title: "",
  slug: "",
  description: "",
  category_id: null,
  subcategory_id: null,
  design_origin: "original_zerocraft",
  rights_status: "not_applicable",
  product_type: "physical",
  status: "draft",
  sku: "",
  price: 0,
  compare_at_price: null,
  currency: "INR",
  stock: 0,
  image_url: "",
  variants: [],
};

const slugify = (value: string) =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const skuFromTitle = (value: string) => {
  const base = value.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 18);
  return base ? `ZC-${base}` : "";
};

const fieldClass = "grid gap-2 text-[15px] font-medium";
const selectClass = "h-10 w-full rounded-lg border border-input bg-background px-3 text-[15px] outline-none focus:border-ring focus:ring-3 focus:ring-ring/20";
const cardClass = "rounded-xl border border-border bg-card shadow-none";

export function ProductEditor({
  mode,
  productId,
}: {
  mode: "create" | "edit";
  productId?: string;
}) {
  const router = useRouter();
  const [product, setProduct] = useState<ProductDraft>(emptyProduct);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [skuTouched, setSkuTouched] = useState(mode === "edit");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch("/api/studio/store", { cache: "no-store" });
        const result = (await response.json()) as StorePayload & { error?: string };
        if (!response.ok) throw new Error(result.error || "Products could not be loaded.");
        if (!active) return;
        setCategories(result.categories || []);
        if (mode === "edit") {
          const current = result.products.find((item) => item.id === productId);
          if (!current) throw new Error("Product not found.");
          setProduct({
            ...current,
            variants: current.store_product_variants || current.variants || [],
          });
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Product could not be loaded.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [mode, productId]);

  const subcategories = useMemo(
    () => categories.find((item) => item.id === product.category_id)?.store_subcategories || [],
    [categories, product.category_id],
  );

  function update<K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) {
    setProduct((current) => ({ ...current, [key]: value }));
  }

  function updateTitle(title: string) {
    setProduct((current) => ({
      ...current,
      title,
      slug: slugTouched ? current.slug : slugify(title),
      sku: skuTouched ? current.sku : skuFromTitle(title),
    }));
  }

  function updateVariant(index: number, changes: Partial<Variant>) {
    setProduct((current) => ({
      ...current,
      variants: current.variants.map((variant, row) => row === index ? { ...variant, ...changes } : variant),
    }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/studio/store", {
        method: mode === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity: "product",
          ...(mode === "edit" ? { id: productId } : {}),
          data: product,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Product could not be saved.");
      router.push("/store/products");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Product could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className={`${cardClass} p-8 text-sm text-muted-foreground`}>Loading product…</div>;
  }

  return (
    <form onSubmit={save} className="mx-auto w-full max-w-[1120px] pb-32">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-5">
        <div className="flex min-w-0 items-center gap-3">
          <Button type="button" variant="outline" size="icon" aria-label="Back to products" onClick={() => router.push("/store/products")}>
            <IconArrowLeft />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-2xl font-semibold tracking-tight">{mode === "create" ? "Add product" : product.title || "Edit product"}</h1>
              {mode === "edit" && <Badge variant="secondary" className="capitalize">{product.status}</Badge>}
            </div>
            <p className="mt-1 text-[15px] text-muted-foreground">{mode === "create" ? "Create a product for your online store." : "Update product details, pricing, inventory, and publishing."}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={() => router.push("/store/products")}>Discard</Button>
          <Button type="submit" disabled={saving || !product.title || !product.slug || !product.sku}>
            <IconDeviceFloppy /> {saving ? "Saving…" : mode === "create" ? "Save product" : "Save"}
          </Button>
        </div>
      </header>

      {error && <Alert variant="destructive" className="mb-5"><AlertTitle>Couldn’t save product</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-6">
          <section className={`${cardClass} grid gap-5 p-6 lg:p-7`}>
            <label className={fieldClass}>Title<Input autoFocus value={product.title} onChange={(event) => updateTitle(event.target.value)} placeholder="Short sleeve t-shirt" /></label>
            <label className={fieldClass}>Description<Textarea rows={7} value={product.description} onChange={(event) => update("description", event.target.value)} placeholder="Describe the product, materials, and key details…" /></label>
          </section>

          <section className={`${cardClass} p-6 lg:p-7`}>
            <div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold">Media</h2><p className="text-sm text-muted-foreground">Add a product image URL. File uploads become available after creation.</p></div><IconPhoto className="size-5 text-muted-foreground" /></div>
            <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
              <div className="relative grid aspect-square place-items-center overflow-hidden rounded-xl border border-dashed bg-muted/40">
                {product.image_url ? <Image unoptimized fill sizes="120px" src={product.image_url} alt="Product preview" className="object-cover" /> : <IconPhoto className="size-8 text-muted-foreground" />}
              </div>
              <label className={fieldClass}>Image URL<Input type="url" value={product.image_url} onChange={(event) => update("image_url", event.target.value)} placeholder="https://…" /></label>
            </div>
          </section>

          <section className={`${cardClass} grid gap-5 p-6 lg:p-7`}>
            <h2 className="font-semibold">Pricing</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className={fieldClass}>Price<Input type="number" min="0" step="0.01" value={product.price} onChange={(event) => update("price", Number(event.target.value))} /></label>
              <label className={fieldClass}>Compare-at price<Input type="number" min="0" step="0.01" value={product.compare_at_price ?? ""} onChange={(event) => update("compare_at_price", event.target.value ? Number(event.target.value) : null)} /></label>
              <label className={fieldClass}>Currency<select className={selectClass} value={product.currency} onChange={(event) => update("currency", event.target.value)}><option value="INR">INR</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option></select></label>
            </div>
          </section>

          <section className={`${cardClass} grid gap-5 p-6 lg:p-7`}>
            <div><h2 className="font-semibold">Inventory</h2><p className="text-sm text-muted-foreground">Track this product by SKU and available quantity.</p></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={fieldClass}>SKU<Input value={product.sku} onChange={(event) => { setSkuTouched(true); update("sku", event.target.value.toUpperCase()); }} /></label>
              {product.product_type === "physical" && <label className={fieldClass}>Quantity<Input type="number" min="0" step="1" value={product.stock ?? 0} onChange={(event) => update("stock", Number(event.target.value))} /></label>}
            </div>
          </section>

          <section className={`${cardClass} p-6 lg:p-7`}>
            <div className="mb-4 flex items-center justify-between">
              <div><h2 className="font-semibold">Variants</h2><p className="text-sm text-muted-foreground">Add options such as size, color, or format.</p></div>
              <Button type="button" variant="outline" size="sm" onClick={() => setProduct((current) => ({ ...current, variants: [...current.variants, { label: "", sku: `${current.sku || "ZC-PRODUCT"}-${current.variants.length + 1}`, options: {}, price: current.price, stock: current.product_type === "physical" ? 0 : null, is_active: true }] }))}><IconPlus /> Add variant</Button>
            </div>
            {product.variants.length === 0 ? <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">This product has no variants.</div> : <div className="grid gap-3">{product.variants.map((variant, index) => <div key={variant.id || index} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_110px_90px_auto] sm:items-end"><label className={fieldClass}>Option name<Input value={variant.label} onChange={(event) => updateVariant(index, { label: event.target.value, options: { title: event.target.value } })} placeholder="Black / Large" /></label><label className={fieldClass}>SKU<Input value={variant.sku} onChange={(event) => updateVariant(index, { sku: event.target.value.toUpperCase() })} /></label><label className={fieldClass}>Price<Input type="number" min="0" step="0.01" value={variant.price} onChange={(event) => updateVariant(index, { price: Number(event.target.value) })} /></label>{product.product_type === "physical" && <label className={fieldClass}>Stock<Input type="number" min="0" step="1" value={variant.stock ?? 0} onChange={(event) => updateVariant(index, { stock: Number(event.target.value) })} /></label>}<Button type="button" variant="ghost" size="icon" aria-label={`Remove variant ${index + 1}`} onClick={() => setProduct((current) => ({ ...current, variants: current.variants.filter((_, row) => row !== index) }))}><IconTrash /></Button></div>)}</div>}
          </section>

          <section className={`${cardClass} grid gap-5 p-6 lg:p-7`}>
            <h2 className="font-semibold">Search engine listing</h2>
            <div className="rounded-lg border bg-background p-4"><p className="text-sm text-blue-600">{product.title || "Product title"}</p><p className="mt-1 text-xs text-emerald-700">/product/{product.slug || "product-handle"}</p><p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{product.description || "Add a description to preview how this product could appear in search results."}</p></div>
            <label className={fieldClass}>URL handle<Input pattern="[a-z0-9]+(-[a-z0-9]+)*" value={product.slug} onChange={(event) => { setSlugTouched(true); update("slug", event.target.value); }} /></label>
          </section>
        </div>

        <aside className="grid gap-6 xl:sticky xl:top-6">
          <section className={`${cardClass} grid gap-5 p-6`}>
            <h2 className="font-semibold">Status</h2>
            <label className={fieldClass}><span className="sr-only">Product status</span><select className={selectClass} value={product.status} onChange={(event) => update("status", event.target.value as ProductDraft["status"])}><option value="draft">Draft</option><option value="active">Active</option><option value="archived">Archived</option></select></label>
            {product.status === "active" && product.rights_status === "review_required" && <p className="text-xs text-destructive">Rights review must be completed before publishing.</p>}
          </section>

          <section className={`${cardClass} grid gap-5 p-6`}>
            <div className="flex items-center justify-between"><h2 className="font-semibold">Product organization</h2><IconChevronDown className="size-4 text-muted-foreground" /></div>
            <label className={fieldClass}>Category<select className={selectClass} value={product.category_id || ""} onChange={(event) => { update("category_id", event.target.value || null); update("subcategory_id", null); }}><option value="">Uncategorized</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            <label className={fieldClass}>Subcategory<select className={selectClass} value={product.subcategory_id || ""} disabled={!product.category_id} onChange={(event) => update("subcategory_id", event.target.value || null)}><option value="">None</option>{subcategories.map((subcategory) => <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>)}</select></label>
            <label className={fieldClass}>Product type<select className={selectClass} value={product.product_type} onChange={(event) => update("product_type", event.target.value as ProductDraft["product_type"])}><option value="physical">Physical</option><option value="digital">Digital</option></select></label>
          </section>

          <section className={`${cardClass} grid gap-5 p-6`}>
            <div className="flex items-center gap-2"><IconBox className="size-4" /><h2 className="font-semibold">Rights & origin</h2></div>
            <label className={fieldClass}>Design origin<select className={selectClass} value={product.design_origin} onChange={(event) => update("design_origin", event.target.value as ProductDraft["design_origin"])}><option value="original_zerocraft">Original ZeroCraft</option><option value="licensed">Licensed</option><option value="fan_inspired">Fan inspired</option></select></label>
            <label className={fieldClass}>Rights status<select className={selectClass} value={product.rights_status} onChange={(event) => update("rights_status", event.target.value as ProductDraft["rights_status"])}><option value="not_applicable">Not applicable</option><option value="approved_license">Approved licence</option><option value="review_required">Review required</option></select></label>
          </section>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/90 px-4 py-3 backdrop-blur lg:pl-28">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-4"><p className="text-[15px] text-muted-foreground">{mode === "create" ? "Unsaved product" : `Editing ${product.title}`}</p><div className="flex gap-3"><Button type="button" variant="outline" onClick={() => router.push("/store/products")}>Discard</Button><Button type="submit" disabled={saving || !product.title || !product.slug || !product.sku}><IconDeviceFloppy /> {saving ? "Saving…" : "Save"}</Button></div></div>
      </div>
    </form>
  );
}
