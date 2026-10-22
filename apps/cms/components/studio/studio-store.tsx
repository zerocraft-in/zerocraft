"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { DateRange } from "react-day-picker";
import {
  IconArrowUpRight,
  IconBox,
  IconCirclePlus,
  IconEdit,
  IconStack3,
  IconPackage,
  IconPlus,
  IconShoppingBag,
  IconTag,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { StoreProductsDataTable } from "@/components/studio/store-products-data-table";
import { StoreOverviewDashboard } from "@/components/studio/store-overview-dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  is_active: boolean;
  store_subcategories?: Subcategory[];
};
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
type Variant = {
  id?: string;
  label: string;
  sku: string;
  options: Record<string, string>;
  price: number;
  stock: number | null;
  is_active: boolean;
  store_inventory_levels?: {
    location_id: string;
    on_hand: number;
    reserved: number;
  }[];
};
type ProductMedia = {
  id: string;
  storage_path: string;
  public_url: string;
  alt_text: string;
  sort_order: number;
  media_type: "image" | "video" | "document";
  is_primary: boolean;
};
type Product = {
  id: string;
  category_id: string | null;
  subcategory_id: string | null;
  design_origin: "original_zerocraft" | "licensed" | "fan_inspired";
  rights_status: "not_applicable" | "approved_license" | "review_required";
  title: string;
  slug: string;
  description: string;
  product_type: "physical" | "digital";
  status: "draft" | "active" | "archived";
  sku: string;
  price: number;
  compare_at_price: number | null;
  currency: string;
  stock: number | null;
  image_url: string;
  store_product_variants: Variant[];
  store_product_media?: ProductMedia[];
};
type Payload = {
  configured: boolean;
  catalogError: string | null;
  categories: Category[];
  products: Product[];
  catalogHealth: {
    activeCategories: number;
    activeSubcategories: number;
    activeProducts: number;
    productsWithoutMedia: string[];
    productsWithoutVariants: string[];
    rightsReviewProducts: string[];
    orphanedTaxonomy: string[];
    duplicateCategorySlugs: string[];
    duplicateProductSlugs: string[];
    duplicateProductSkus: string[];
  } | null;
  orders: {
    available: boolean;
    count: number | null;
    pending: number | null;
    paidTotal: number | null;
    currencyCount: number;
    currency: string | null;
    paidByCurrency: Record<string, number>;
    recent: {
      id: string;
      total: number;
      currency: string | null;
      status: string;
      payment_status: string;
      created_at: string;
    }[];
  };
};
type ProductDraft = Omit<Product, "id" | "store_product_variants"> & {
  variants: Variant[];
};
type HealthFilter = "all" | "missing_media" | "missing_variants" | "rights_review" | "taxonomy" | "duplicate_slug" | "duplicate_sku";

const emptyProduct: ProductDraft = {
  title: "",
  slug: "",
  category_id: null,
  subcategory_id: null,
  design_origin: "original_zerocraft",
  rights_status: "not_applicable",
  description: "",
  product_type: "physical",
  status: "draft",
  sku: "",
  price: 0,
  compare_at_price: null,
  currency: "USD",
  stock: 0,
  image_url: "",
  variants: [],
};
const emptyCategory: Omit<Category, "id"> = {
  name: "",
  slug: "",
  description: "",
  image_url: "",
  is_active: true,
};
const emptySubcategory: Omit<Subcategory, "id"> = {
  category_id: "",
  name: "",
  slug: "",
  description: "",
  image_url: "",
  sort_order: 0,
  is_active: true,
};
const money = (amount: number, currency: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const skuPart = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]+/g, "").slice(0, 16) || "PRODUCT";
const skuSuffix = (value: string) => value.match(/[A-Z0-9]{4,8}$/i)?.[0].toUpperCase() || Date.now().toString(36).slice(-6).toUpperCase();
const generatedProductSku = (title: string, currentSku = "") => `ZC-${skuPart(title)}-${skuSuffix(currentSku)}`;
const generatedVariantSku = (productSku: string, label: string, index: number) => `${productSku}-${skuPart(label).slice(0, 10) || "VARIANT"}-${String(index + 1).padStart(2, "0")}`;
const noProducts: Product[] = [];
const noCategories: Category[] = [];
const labelClass = "grid gap-1.5 text-xs font-medium text-muted-foreground";
const panelClass = "rounded-xl border border-border bg-card shadow-sm";

export default function StudioStore({
  initialView = "overview",
}: {
  initialView?: "overview" | "products" | "categories";
}) {
  const router = useRouter();
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [permissions, setPermissions] = useState<string[] | null>(null);
  const [view, setView] = useState<"overview" | "products" | "categories">(
    initialView,
  );
  const [healthFilter, setHealthFilter] = useState<HealthFilter>("all");
  const [editor, setEditor] = useState<
    | { kind: "product"; value: ProductDraft; id?: string }
    | { kind: "category"; value: Omit<Category, "id">; id?: string }
    | { kind: "subcategory"; value: Omit<Subcategory, "id">; id?: string }
    | null
  >(null);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const [busy, setBusy] = useState(false);
  const [range, setRange] = useState<"7d" | "30d" | "90d" | "all" | "custom">(
    "30d",
  );
  const [now] = useState(() => Date.now());
  const [dateRange, setDateRange] = useState<DateRange>(() => ({
    from: new Date(Date.now() - 29 * 86400000),
    to: new Date(),
  }));

  const requestStore = useCallback(async () => {
    const response = await fetch("/api/studio/store", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.error || "Store data could not be loaded.");
    return result as Payload;
  }, []);
  const load = useCallback(
    async (showLoading = false) => {
      if (showLoading) setLoading(true);
      try {
        setData(await requestStore());
        setError("");
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Store data could not be loaded.",
        );
      } finally {
        setLoading(false);
      }
    },
    [requestStore],
  );
  useEffect(() => {
    let current = true;
    requestStore()
      .then((result) => {
        if (current) setData(result);
      })
      .catch((cause: unknown) => {
        if (current)
          setError(
            cause instanceof Error
              ? cause.message
              : "Store data could not be loaded.",
          );
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [requestStore]);
  useEffect(() => {
    let current = true;
    void fetch("/api/studio/me", { cache: "no-store" })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((result) => {
        if (current && Array.isArray(result?.permissions)) setPermissions(result.permissions);
      })
      .catch(() => undefined);
    return () => { current = false; };
  }, []);
  useEffect(() => {
    const syncViewFromHash = () => {
      const section = window.location.hash.slice(1);
      setView(
        section === "products" || section === "categories"
          ? section
          : initialView,
      );
    };
    syncViewFromHash();
    window.addEventListener("hashchange", syncViewFromHash);
    return () => window.removeEventListener("hashchange", syncViewFromHash);
  }, [initialView]);

  const products = data?.products ?? noProducts;
  const categories = data?.categories ?? noCategories;
  const canManageCatalog = permissions?.includes("catalog.manage") === true;
  const healthSlugs = data?.catalogHealth ? (() => {
    const health = data.catalogHealth!;
    if (healthFilter === "missing_media") return health.productsWithoutMedia;
    if (healthFilter === "missing_variants") return health.productsWithoutVariants;
    if (healthFilter === "rights_review") return health.rightsReviewProducts;
    if (healthFilter === "taxonomy") return health.orphanedTaxonomy;
    if (healthFilter === "duplicate_slug") return health.duplicateProductSlugs;
    if (healthFilter === "duplicate_sku") return health.duplicateProductSkus;
    return [];
  })() : [];
  const openHealthFilter = (filter: Exclude<HealthFilter, "all">) => {
    setHealthFilter(filter);
    setView("products");
    window.location.hash = "products";
  };
  const rangeDays =
    range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : null;
  const periodOrders = (data?.orders.recent ?? []).filter((order) => {
    const createdAt = new Date(order.created_at).getTime();
    if (range === "custom") {
      const from = dateRange.from?.getTime() ?? 0;
      const to = dateRange.to?.getTime() ?? from;
      return createdAt >= from && createdAt <= to + 86400000 - 1;
    }
    if (!rangeDays) return true;
    return now - createdAt <= rangeDays * 86400000;
  });
  const periodSales = periodOrders
    .filter(
      (order) => order.payment_status === "paid" || order.status === "paid",
    )
    .reduce((sum, order) => sum + Number(order.total || 0), 0);
  const displayedSales =
    range === "all" && data?.orders.paidTotal != null
      ? data.orders.paidTotal
      : periodSales;
  async function persist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/studio/store", {
        method: editor.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity: editor.kind,
          ...(editor.id ? { id: editor.id } : {}),
          data: editor.value,
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "The store record could not be saved.");
      setEditor(null);
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not save. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(
    entity: "product" | "category" | "subcategory",
    id: string,
    name: string,
  ) {
    if (busy || !window.confirm(`Archive “${name}”? It will be hidden from the public store and kept for history.`))
      return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/studio/store", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity, id }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "The record could not be deleted.");
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not delete. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function bulkUpdateStatus(
    selected: Product[],
    status: "active" | "archived",
  ) {
    if (busy || !selected.length) return;
    setBusy(true);
    setError("");
    try {
      await Promise.all(
        selected.map(async (product) => {
          const response = await fetch("/api/studio/store", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              entity: "product",
              id: product.id,
              data: {
                ...product,
                status,
                variants: product.store_product_variants || [],
              },
            }),
          });
          if (!response.ok) {
            const result = await response.json();
            throw new Error(
              result.error || "Some products could not be updated.",
            );
          }
        }),
      );
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Products could not be updated.",
      );
    } finally {
      setBusy(false);
    }
  }

  function editProduct(product?: Product) {
    router.push(product ? `/products/${product.id}` : "/products/new");
  }

  async function uploadProductMedia(file: File) {
    if (!editor || editor.kind !== "product" || !editor.id || mediaBusy) return;
    setMediaBusy(true);
    setMediaError("");
    try {
      const form = new FormData();
      form.set("productId", editor.id);
      form.set("file", file);
      const response = await fetch("/api/studio/store/media", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The product image could not be uploaded.");
      await load();
      setEditor((current) => current && current.kind === "product" ? { ...current, value: { ...current.value, store_product_media: [...(current.value.store_product_media || []), result.media] } } : current);
    } catch (cause) {
      setMediaError(cause instanceof Error ? cause.message : "The product image could not be uploaded.");
    } finally {
      setMediaBusy(false);
    }
  }

  async function updateProductMedia(media: ProductMedia, action: "primary" | "delete") {
    if (!editor || editor.kind !== "product" || !editor.id || mediaBusy) return;
    setMediaBusy(true);
    setMediaError("");
    try {
      const response = await fetch("/api/studio/store/media", {
        method: action === "delete" ? "DELETE" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "delete" ? { productId: editor.id, mediaId: media.id } : { productId: editor.id, mediaId: media.id, action }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The product media could not be updated.");
      await load();
      setEditor((current) => {
        if (!current || current.kind !== "product") return current;
        const mediaRows = current.value.store_product_media || [];
        return { ...current, value: { ...current.value, store_product_media: action === "delete" ? mediaRows.filter((row) => row.id !== media.id) : mediaRows.map((row) => ({ ...row, is_primary: row.id === media.id })) } };
      });
    } catch (cause) {
      setMediaError(cause instanceof Error ? cause.message : "The product media could not be updated.");
    } finally {
      setMediaBusy(false);
    }
  }

  async function reorderProductMedia(media: ProductMedia, direction: "up" | "down") {
    if (!editor || editor.kind !== "product" || !editor.id || mediaBusy) return;
    const rows = [...(editor.value.store_product_media || [])].sort((a, b) => a.sort_order - b.sort_order);
    const index = rows.findIndex((row) => row.id === media.id);
    const neighborIndex = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || neighborIndex < 0 || neighborIndex >= rows.length) return;
    setMediaBusy(true);
    setMediaError("");
    try {
      const updates = [
        [rows[index], rows[neighborIndex].sort_order],
        [rows[neighborIndex], rows[index].sort_order],
      ] as const;
      for (const [row, sortOrder] of updates) {
        const response = await fetch("/api/studio/store/media", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: editor.id, mediaId: row.id, action: "reorder", sortOrder }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "The image order could not be updated.");
      }
      await load();
      setEditor((current) => current && current.kind === "product" ? { ...current, value: { ...current.value, store_product_media: rows.map((row, rowIndex) => rowIndex === index ? { ...row, sort_order: rows[neighborIndex].sort_order } : rowIndex === neighborIndex ? { ...row, sort_order: rows[index].sort_order } : row) } } : current);
    } catch (cause) {
      setMediaError(cause instanceof Error ? cause.message : "The image order could not be updated.");
    } finally {
      setMediaBusy(false);
    }
  }
  function editCategory(category?: Category) {
    setError("");
    setEditor({
      kind: "category",
      id: category?.id,
      value: category
        ? {
            name: category.name,
            slug: category.slug,
            description: category.description,
            image_url: category.image_url,
            is_active: category.is_active,
          }
        : { ...emptyCategory },
    });
  }
  function editSubcategory(subcategory?: Subcategory, categoryId?: string) {
    setError("");
    setEditor({
      kind: "subcategory",
      id: subcategory?.id,
      value: subcategory ? { ...subcategory } : { ...emptySubcategory, category_id: categoryId || categories[0]?.id || "" },
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-14">
      {error && (
        <p
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      )}
      {data && !data.configured && (
        <div className="flex flex-col gap-1 rounded-xl border border-amber-400/30 bg-amber-400/5 p-4 text-sm">
          <strong className="font-medium text-amber-700 dark:text-amber-300">
            Catalog database setup needed
          </strong>
          <span className="text-muted-foreground">
            {data.catalogError ||
              "Apply supabase/studio-store-catalog.sql in your Supabase project to enable product and category management."}
          </span>
        </div>
      )}
      {view === "overview" && (
        <StoreOverviewDashboard
          products={products}
          loading={loading}
          range={range}
          setRange={setRange}
          dateRange={dateRange}
          setDateRange={setDateRange}
          displayedSales={displayedSales}
          periodOrders={periodOrders}
          ordersAvailable={data?.orders.available ?? false}
          orderCount={data?.orders.count ?? null}
          pendingOrders={data?.orders.pending ?? null}
          ordersCurrency={data?.orders.currency ?? null}
          mixedOrderCurrencies={(data?.orders.currencyCount ?? 0) > 1}
          catalogHealth={data?.catalogHealth ?? null}
          canManageCatalog={canManageCatalog}
          configured={data?.configured ?? false}
          editProduct={() => editProduct()}
          onRefresh={() => void load(true)}
          openHealthFilter={openHealthFilter}
        />
      )}
      {view === "products" && (
        <section className="min-h-0 flex-none overflow-hidden">
          <header className="mb-5 flex flex-col gap-4 border-b border-border/70 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">{data?.configured ? products.length : "—"} total</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">Manage listings, pricing, variants, and inventory in one place.</p>
            </div>
            {canManageCatalog && <Button type="button" disabled={!data?.configured} onClick={() => editProduct()} className="shrink-0"><IconPlus size={16} /> New product</Button>}
          </header>
          <StoreProductsDataTable
            data={products}
            categories={categories}
            canManageCatalog={canManageCatalog}
            healthFilter={healthFilter}
            healthSlugs={healthSlugs}
            onClearHealthFilter={() => setHealthFilter("all")}
            loading={loading}
            configured={Boolean(data?.configured)}
            onEdit={(product) => editProduct(product)}
            onDelete={(product) =>
              void remove("product", product.id, product.title)
            }
            onBulkStatus={(selected, status) =>
              void bulkUpdateStatus(selected, status)
            }
          />{" "}
        </section>
      )}
      {view === "categories" && (
        <section className={`overflow-hidden rounded-xl border ${panelClass}`}>
          <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-4">
            <div>
              <p className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground">
                CATALOG / ORGANIZATION
              </p>
              <h2 className="mt-1 text-base font-semibold">
                Categories{" "}
                <small>{data?.configured ? categories.length : "—"}</small>
              </h2>
            </div>
            {canManageCatalog && <button
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
              type="button"
              disabled={!data?.configured}
              onClick={() => editCategory()}
            >
              <IconPlus size={16} /> New category
            </button>}
          </div>
          {loading ? (
            <StoreSkeleton />
          ) : data?.configured && categories.length ? (
            <div className="divide-y divide-border/60">
              {categories.map((category) => (
                <article
                  key={category.id}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                    <IconTag size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate text-sm font-medium">
                      {category.name}
                    </strong>
                    <small className="block text-xs text-muted-foreground">
                      /{category.slug} ·{" "}
                      {
                        products.filter(
                          (product) => product.category_id === category.id,
                        ).length
                      }{" "}
                      products
                    </small>
                  </div>
                  <Badge variant={category.is_active ? "default" : "secondary"}>
                    {category.is_active ? "Active" : "Hidden"}
                  </Badge>
                  {canManageCatalog && <span className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => editSubcategory(undefined, category.id)}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <IconPlus size={14} /> Subcategory
                    </button>
                    <button
                      type="button"
                      onClick={() => editCategory(category)}
                      className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label={`Edit ${category.name}`}
                    >
                      <IconEdit size={16} />
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void remove("category", category.id, category.name)
                      }
                      className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Delete ${category.name}`}
                    >
                      <IconTrash size={16} />
                    </button>
                  </span>}
                  {(category.store_subcategories || []).length > 0 && (
                    <div className="ml-12 mt-2 flex flex-wrap gap-2">
                      {(category.store_subcategories || []).map((subcategory) => (
                        canManageCatalog ? <button key={subcategory.id} type="button" onClick={() => editSubcategory(subcategory)} className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:border-foreground hover:text-foreground">
                          {subcategory.name} · {subcategory.is_active ? "Active" : "Hidden"}
                        </button> : <span key={subcategory.id} className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">
                          {subcategory.name} · {subcategory.is_active ? "Active" : "Hidden"}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
              <IconStack3 size={21} />
              <strong className="text-sm font-medium">No categories yet</strong>
              <span className="max-w-sm text-xs leading-5 text-muted-foreground">
                Create a category to organize your digital and physical catalog.
              </span>
            </div>
          )}
        </section>
      )}
      {editor && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:p-8"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy) setEditor(null);
          }}
        >
          <section
            className={`my-auto max-h-[calc(100dvh-2rem)] w-full max-w-3xl overflow-y-auto rounded-2xl border bg-card p-5 text-card-foreground shadow-2xl sm:p-6 ${panelClass}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="store-editor-title"
          >
            <header className="mb-5 flex items-start justify-between gap-4 border-b border-border/60 pb-4">
              <div>
                <p className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground">
                  CATALOG / EDITOR
                </p>
                <h2
                  id="store-editor-title"
                  className="mt-1 text-lg font-semibold"
                >
                  {editor.id ? "Edit" : "Create"} {editor.kind}
                </h2>
              </div>
              <button
                type="button"
                disabled={busy}
                aria-label="Close editor"
                className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => setEditor(null)}
              >
                <IconX size={17} />
              </button>
            </header>
            <form
              className="grid gap-5 [&_input:not([type=checkbox])]:h-9 [&_input:not([type=checkbox])]:w-full [&_input:not([type=checkbox])]:rounded-lg [&_input:not([type=checkbox])]:border [&_input:not([type=checkbox])]:border-input [&_input:not([type=checkbox])]:bg-transparent [&_input:not([type=checkbox])]:px-2.5 [&_input:not([type=checkbox])]:text-sm [&_input:not([type=checkbox])]:outline-none [&_input:not([type=checkbox])]:focus-visible:border-ring [&_input:not([type=checkbox])]:focus-visible:ring-3 [&_input:not([type=checkbox])]:focus-visible:ring-ring/50 [&_select]:h-9 [&_select]:w-full [&_select]:rounded-lg [&_select]:border [&_select]:border-input [&_select]:bg-transparent [&_select]:px-2.5 [&_select]:text-sm [&_textarea]:w-full [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-input [&_textarea]:bg-transparent [&_textarea]:p-2.5 [&_textarea]:text-sm [&_textarea]:outline-none [&_textarea]:focus-visible:border-ring [&_textarea]:focus-visible:ring-3 [&_textarea]:focus-visible:ring-ring/50 [&_label]:grid [&_label]:gap-1.5 [&_label]:text-xs [&_label]:font-medium [&_label]:text-muted-foreground"
              onSubmit={(event) => void persist(event)}
            >
              {editor.kind === "category" ? (
                <>
                  <label>
                    Category name
                    <input
                      required
                      maxLength={100}
                      value={editor.value.name}
                      onChange={(event) => {
                        const name = event.target.value;
                        setEditor({
                          ...editor,
                          value: {
                            ...editor.value,
                            name,
                            slug: editor.id ? editor.value.slug : slugify(name),
                          },
                        });
                      }}
                    />
                  </label>
                  <label>
                    URL slug
                    <input
                      required
                      pattern="[a-z0-9]+(-[a-z0-9]+)*"
                      value={editor.value.slug}
                      onChange={(event) =>
                        setEditor({
                          ...editor,
                          value: { ...editor.value, slug: event.target.value },
                        })
                      }
                    />
                  </label>
                  <label>
                    Description
                    <textarea
                      rows={3}
                      value={editor.value.description}
                      onChange={(event) =>
                        setEditor({
                          ...editor,
                          value: {
                            ...editor.value,
                            description: event.target.value,
                          },
                        })
                      }
                    />
                  </label>
                  <label>
                    Image URL
                    <input
                      type="url"
                      value={editor.value.image_url}
                      onChange={(event) =>
                        setEditor({
                          ...editor,
                          value: {
                            ...editor.value,
                            image_url: event.target.value,
                          },
                        })
                      }
                    />
                  </label>
                  <label className={`${labelClass} flex items-center gap-2`}>
                    <input
                      type="checkbox"
                      checked={editor.value.is_active}
                      onChange={(event) =>
                        setEditor({
                          ...editor,
                          value: {
                            ...editor.value,
                            is_active: event.target.checked,
                          },
                        })
                      }
                    />{" "}
                    Visible in the store
                  </label>
                </>
              ) : editor.kind === "subcategory" ? (
                <>
                  <label>
                    Parent category
                    <select value={editor.value.category_id} onChange={(event) => setEditor({ ...editor, value: { ...editor.value, category_id: event.target.value } })}>
                      <option value="">Choose a category</option>
                      {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                    </select>
                  </label>
                  <label>
                    Subcategory name
                    <input required maxLength={100} value={editor.value.name} onChange={(event) => { const name = event.target.value; setEditor({ ...editor, value: { ...editor.value, name, slug: editor.id ? editor.value.slug : slugify(name) } }); }} />
                  </label>
                  <label>
                    URL slug
                    <input required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={editor.value.slug} onChange={(event) => setEditor({ ...editor, value: { ...editor.value, slug: event.target.value } })} />
                  </label>
                  <label>
                    Description
                    <textarea rows={3} value={editor.value.description} onChange={(event) => setEditor({ ...editor, value: { ...editor.value, description: event.target.value } })} />
                  </label>
                  <label className={`${labelClass} flex items-center gap-2`}><input type="checkbox" checked={editor.value.is_active} onChange={(event) => setEditor({ ...editor, value: { ...editor.value, is_active: event.target.checked } })} /> Visible in the store</label>
                </>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label>
                      Product name
                      <input
                        required
                        maxLength={180}
                        value={editor.value.title}
                        onChange={(event) => {
                          const title = event.target.value;
                          setEditor({
                            ...editor,
                            value: {
                              ...editor.value,
                              title,
                              slug: editor.id
                                ? editor.value.slug
                                : slugify(title),
                              sku: editor.id
                                ? editor.value.sku
                                : generatedProductSku(title, editor.value.sku),
                              variants: editor.id
                                ? editor.value.variants
                                : editor.value.variants.map((item, row) => ({
                                    ...item,
                                    sku: generatedVariantSku(generatedProductSku(title, editor.value.sku), item.label, row),
                                  })),
                            },
                          });
                        }}
                      />
                    </label>
                    <label>
                      SKU
                      <input
                        required
                        value={editor.value.sku}
                        readOnly
                        aria-readonly="true"
                      />
                    </label>
                    <label>
                      URL slug
                      <input
                        required
                        pattern="[a-z0-9]+(-[a-z0-9]+)*"
                        value={editor.value.slug}
                        onChange={(event) =>
                          setEditor({
                            ...editor,
                            value: {
                              ...editor.value,
                              slug: event.target.value,
                            },
                          })
                        }
                      />
                    </label>
                    <label>
                      Category
                      <select
                        value={editor.value.category_id || ""}
                        onChange={(event) =>
                          setEditor({
                            ...editor,
                            value: {
                              ...editor.value,
                              category_id: event.target.value || null,
                              subcategory_id: null,
                            },
                          })
                        }
                      >
                        <option value="">Uncategorized</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Subcategory
                      <select
                        value={editor.value.subcategory_id || ""}
                        onChange={(event) => setEditor({ ...editor, value: { ...editor.value, subcategory_id: event.target.value || null } })}
                      >
                        <option value="">Choose a subcategory</option>
                        {(categories.find((category) => category.id === editor.value.category_id)?.store_subcategories || []).map((subcategory) => (
                          <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Design origin
                      <select value={editor.value.design_origin} onChange={(event) => setEditor({ ...editor, value: { ...editor.value, design_origin: event.target.value as ProductDraft["design_origin"] } })}>
                        <option value="original_zerocraft">Original Zerocraft design</option>
                        <option value="licensed">Licensed design</option>
                        <option value="fan_inspired">Fan-inspired design</option>
                      </select>
                    </label>
                    <label>
                      Rights status
                      <select value={editor.value.rights_status} onChange={(event) => setEditor({ ...editor, value: { ...editor.value, rights_status: event.target.value as ProductDraft["rights_status"] } })}>
                        <option value="not_applicable">Not applicable</option>
                        <option value="approved_license">Approved license</option>
                        <option value="review_required">Review required</option>
                      </select>
                    </label>
                    <label>
                      Product type
                      <select
                        value={editor.value.product_type}
                        onChange={(event) =>
                          setEditor({
                            ...editor,
                            value: {
                              ...editor.value,
                              product_type: event.target
                                .value as ProductDraft["product_type"],
                              stock:
                                event.target.value === "digital"
                                  ? null
                                  : (editor.value.stock ?? 0),
                            },
                          })
                        }
                      >
                        <option value="physical">Physical product</option>
                        <option value="digital">Digital product</option>
                      </select>
                    </label>
                    <label>
                      Visibility
                      <select
                        value={editor.value.status}
                        onChange={(event) =>
                          setEditor({
                            ...editor,
                            value: {
                              ...editor.value,
                              status: event.target
                                .value as ProductDraft["status"],
                            },
                          })
                        }
                      >
                        <option value="draft">Draft</option>
                        <option value="active">Active</option>
                        <option value="archived">Archived</option>
                      </select>
                    </label>
                    <label>
                      Price
                      <input
                        required
                        type="number"
                        min="0"
                        step="0.01"
                        value={editor.value.price}
                        onChange={(event) =>
                          setEditor({
                            ...editor,
                            value: {
                              ...editor.value,
                              price: Number(event.target.value),
                            },
                          })
                        }
                      />
                    </label>
                    <label>
                      Currency
                      <input
                        required
                        maxLength={3}
                        pattern="[A-Za-z]{3}"
                        value={editor.value.currency}
                        onChange={(event) =>
                          setEditor({
                            ...editor,
                            value: {
                              ...editor.value,
                              currency: event.target.value.toUpperCase(),
                            },
                          })
                        }
                      />
                    </label>
                    {editor.value.product_type === "physical" && (
                      <label>
                        On hand
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={editor.value.stock ?? 0}
                          onChange={(event) =>
                            setEditor({
                              ...editor,
                              value: {
                                ...editor.value,
                                stock: Number(event.target.value),
                              },
                            })
                          }
                        />
                      </label>
                    )}
                    <label>
                      Compare at
                      <input
                        type="number"
                        min={editor.value.price}
                        step="0.01"
                        value={editor.value.compare_at_price ?? ""}
                        onChange={(event) =>
                          setEditor({
                            ...editor,
                            value: {
                              ...editor.value,
                              compare_at_price: event.target.value
                                ? Number(event.target.value)
                                : null,
                            },
                          })
                        }
                      />
                    </label>
                    <label className={`${labelClass} sm:col-span-2`}>
                      Image URL
                      <input
                        type="url"
                        value={editor.value.image_url}
                        onChange={(event) =>
                          setEditor({
                            ...editor,
                            value: {
                              ...editor.value,
                              image_url: event.target.value,
                            },
                          })
                        }
                      />
                    </label>
                    {editor.id && (
                      <div className="grid gap-3 rounded-xl border border-border/60 bg-muted/20 p-4 sm:col-span-2">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground">PRODUCT MEDIA</p>
                            <p className="mt-1 text-xs text-muted-foreground">JPEG, PNG, or WebP up to 10 MB. Existing image URLs remain unchanged.</p>
                          </div>
                          <label className="inline-flex cursor-pointer items-center rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-muted">
                            {mediaBusy ? "Uploading…" : "Upload image"}
                            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={mediaBusy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadProductMedia(file); event.currentTarget.value = ""; }} />
                          </label>
                        </div>
                        {(editor.value.store_product_media || []).length > 0 && (
                          <div className="grid gap-2 sm:grid-cols-2">
                            {[...(editor.value.store_product_media || [])].sort((a, b) => a.sort_order - b.sort_order).map((media) => (
                              <div key={media.id} className="flex items-center gap-3 rounded-lg border border-border/60 bg-card p-2">
                                <div role="img" aria-label={media.alt_text || "Product media"} className="size-14 rounded-md bg-cover bg-center" style={{ backgroundImage: `url(${media.public_url})` }} />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-xs font-medium">{media.alt_text || "Product image"}</p>
                                  <p className="text-[10px] text-muted-foreground">{media.is_primary ? "Primary image" : "Additional image"}</p>
                                </div>
                                <div className="flex shrink-0 gap-1">
                                  <button type="button" aria-label="Move image up" className="rounded-md border border-border px-1.5 py-1 text-[10px] hover:bg-muted disabled:opacity-40" disabled={mediaBusy} onClick={() => void reorderProductMedia(media, "up")}>↑</button>
                                  <button type="button" aria-label="Move image down" className="rounded-md border border-border px-1.5 py-1 text-[10px] hover:bg-muted disabled:opacity-40" disabled={mediaBusy} onClick={() => void reorderProductMedia(media, "down")}>↓</button>
                                  {!media.is_primary && <button type="button" className="rounded-md border border-border px-2 py-1 text-[10px] hover:bg-muted" disabled={mediaBusy} onClick={() => void updateProductMedia(media, "primary")}>Primary</button>}
                                  <button type="button" aria-label="Remove product image" className="rounded-md border border-border p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive" disabled={mediaBusy} onClick={() => void updateProductMedia(media, "delete")}><IconTrash size={13} /></button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {mediaError && <p className="text-xs text-destructive">{mediaError}</p>}
                      </div>
                    )}
                    <label className={`${labelClass} sm:col-span-2`}>
                      Description
                      <textarea
                        rows={3}
                        value={editor.value.description}
                        onChange={(event) =>
                          setEditor({
                            ...editor,
                            value: {
                              ...editor.value,
                              description: event.target.value,
                            },
                          })
                        }
                      />
                    </label>
                  </div>
                  <div className="grid gap-3 rounded-xl border border-border/60 bg-muted/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground">
                        VARIANTS
                      </span>
                      <button
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
                        type="button"
                        onClick={() =>
                          setEditor({
                            ...editor,
                            value: {
                              ...editor.value,
                              variants: [
                                ...editor.value.variants,
                                {
                                  label: "",
                                  sku: generatedVariantSku(editor.value.sku || generatedProductSku(editor.value.title), "Variant", editor.value.variants.length),
                                  options: {},
                                  price: editor.value.price,
                                  stock:
                                    editor.value.product_type === "physical"
                                      ? 0
                                      : null,
                                  is_active: true,
                                },
                              ],
                            },
                          })
                        }
                      >
                        <IconCirclePlus size={15} /> Add variant
                      </button>
                    </div>
                    {editor.value.variants.map((variant, index) => (
                      <div
                        key={variant.id || index}
                        className="grid items-end gap-3 rounded-lg border border-border/60 bg-card p-3 sm:grid-cols-[1.2fr_1.2fr_.8fr_.8fr_auto]"
                      >
                        <label>
                          Label
                          <input
                            required
                            value={variant.label}
                            onChange={(event) =>
                              setEditor({
                                ...editor,
                                value: {
                                  ...editor.value,
                                  variants: editor.value.variants.map((item, row) =>
                                    row === index
                                      ? { ...item, label: event.target.value, sku: item.id ? item.sku : generatedVariantSku(editor.value.sku, event.target.value, row) }
                                      : item,
                                  ),
                                },
                              })
                            }
                            placeholder="e.g. A4 · Matte"
                          />
                        </label>
                        <label>
                          SKU
                          <input required value={variant.sku} readOnly aria-readonly="true" placeholder="SKU-01" />
                        </label>
                        <label>
                          Price
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={variant.price}
                            onChange={(event) =>
                              setEditor({
                                ...editor,
                                value: {
                                  ...editor.value,
                                  variants: editor.value.variants.map(
                                    (item, row) =>
                                      row === index
                                        ? {
                                            ...item,
                                            price: Number(event.target.value),
                                          }
                                        : item,
                                  ),
                                },
                              })
                            }
                          />
                        </label>
                        {editor.value.product_type === "physical" && (
                          <label>
                            Stock
                            <input
                              type="number"
                              min="0"
                              value={variant.stock ?? 0}
                              onChange={(event) =>
                                setEditor({
                                  ...editor,
                                  value: {
                                    ...editor.value,
                                    variants: editor.value.variants.map(
                                      (item, row) =>
                                        row === index
                                          ? {
                                              ...item,
                                              stock: Number(event.target.value),
                                            }
                                          : item,
                                    ),
                                  },
                                })
                              }
                            />
                          </label>
                        )}
                        <button
                          type="button"
                          aria-label={`Remove variant ${index + 1}`}
                          onClick={() =>
                            setEditor({
                              ...editor,
                              value: {
                                ...editor.value,
                                variants: editor.value.variants.filter(
                                  (_, row) => row !== index,
                                ),
                              },
                            })
                          }
                        >
                          <IconX size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {error && (
                <p
                  className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
                  role="alert"
                >
                  {error}
                </p>
              )}
              <footer className="flex justify-end gap-2 border-t border-border/60 pt-4">
                <button
                  type="button"
                  onClick={() => setEditor(null)}
                  disabled={busy}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-border px-3 text-sm font-medium hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
                  disabled={busy}
                >
                  {busy ? "Saving…" : editor.id ? "Save changes" : "Create"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

function StoreSkeleton() {
  return (
    <div className="grid gap-3 p-4" aria-label="Loading store data">
      <span className="h-10 animate-pulse rounded-lg bg-muted" />
      <span className="h-10 animate-pulse rounded-lg bg-muted" />
      <span className="h-10 animate-pulse rounded-lg bg-muted" />
      <span className="h-10 animate-pulse rounded-lg bg-muted" />
    </div>
  );
}
