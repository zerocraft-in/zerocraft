"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { format as formatDate } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
  IconAlertTriangle,
  IconArrowUpRight,
  IconArrowDownRight,
  IconBox,
  IconCalendar,
  IconCircleCheck,
  IconCirclePlus,
  IconClock,
  IconCoin,
  IconEdit,
  IconPackageExport,
  IconReceipt,
  IconStack3,
  IconPackage,
  IconPlus,
  IconRefresh,
  IconShoppingBag,
  IconTag,
  IconTrendingUp,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { StoreProductsDataTable } from "@/components/studio/store-products-data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
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

const emptyProduct: ProductDraft = {
  title: "",
  slug: "",
  category_id: null,
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
function availableStock(product: Pick<Product, "product_type" | "stock" | "store_product_variants">) {
  if (product.product_type === "digital") return null;
  if (!product.store_product_variants?.length) return product.stock;
  return product.store_product_variants.reduce((total, variant) => {
    const levels = variant.store_inventory_levels ?? [];
    const available = levels.length
      ? levels.reduce((sum, level) => sum + Math.max(0, level.on_hand - level.reserved), 0)
      : variant.stock ?? 0;
    return total + available;
  }, 0);
}
const labelClass = "grid gap-1.5 text-xs font-medium text-muted-foreground";
const panelClass = "rounded-xl border border-border bg-card shadow-sm";

export default function StudioStore({
  initialView = "overview",
}: {
  initialView?: "overview" | "products" | "categories";
}) {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<"overview" | "products" | "categories">(
    initialView,
  );
  const [editor, setEditor] = useState<
    | { kind: "product"; value: ProductDraft; id?: string }
    | { kind: "category"; value: Omit<Category, "id">; id?: string }
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
  const physicalCount = products.filter(
    (item) => item.product_type === "physical",
  ).length;
  const digitalCount = products.filter(
    (item) => item.product_type === "digital",
  ).length;
  const physicalAngle = products.length
    ? (physicalCount / products.length) * 360
    : 0;
  const lowStockProducts = products.filter(
    (item) =>
      item.product_type === "physical" &&
      availableStock(item) !== null &&
      availableStock(item)! <= 5,
  );
  const outOfStockProducts = products.filter(
    (item) =>
      item.product_type === "physical" &&
      availableStock(item) !== null &&
      availableStock(item)! <= 0,
  );
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
    entity: "product" | "category",
    id: string,
    name: string,
  ) {
    if (busy || !window.confirm(`Delete “${name}”? This cannot be undone.`))
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
    setError("");
    setMediaError("");
    setEditor({
      kind: "product",
      id: product?.id,
      value: product
        ? { ...product, variants: product.store_product_variants || [] }
        : { ...emptyProduct, currency: "USD", sku: generatedProductSku("", "NEW") },
    });
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

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-14">
      {false && view !== "products" && (
        <header className="flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] font-semibold tracking-[0.2em] text-muted-foreground">
              ZEROCRAFT / COMMERCE
            </p>
            <h1 className="mt-2 font-mono text-4xl font-semibold tracking-[-0.08em]">
              Store<span className="text-muted-foreground">.</span>
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              Catalog, categories, inventory and the orders connected to your
              studio.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
            disabled={loading || busy}
            title="Refresh store data"
            onClick={() => void load(true)}
            aria-label="Refresh store data"
          >
            <IconRefresh size={17} />
          </button>
        </header>
      )}
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
        <StoreOverview
          data={data}
          products={products}
          categories={categories}
          loading={loading}
          range={range}
          setRange={setRange}
          dateRange={dateRange}
          setDateRange={setDateRange}
          displayedSales={displayedSales}
          periodOrders={periodOrders}
          lowStockProducts={lowStockProducts}
          outOfStockProducts={outOfStockProducts}
          editProduct={editProduct}
        />
      )}
      {false && view === "overview" && (
        <>
          <section
            className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            aria-label="Store shortcuts"
          >
            <div className="flex w-fit items-center gap-1 rounded-lg border border-border bg-muted/50 p-1">
              <Button size="sm" variant="secondary" aria-current="page">
                Overview
              </Button>
              <Button
                render={<Link href="/studio/store#products" />}
                nativeButton={false}
                size="sm"
                variant="ghost"
              >
                Products
                <span className="text-muted-foreground">
                  {data?.configured ? products.length : "—"}
                </span>
              </Button>
              <Button
                render={<Link href="/studio/store#categories" />}
                nativeButton={false}
                size="sm"
                variant="ghost"
              >
                Categories
                <span className="text-muted-foreground">
                  {data?.configured ? categories.length : "—"}
                </span>
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                render={<Link href="/studio/orders" />}
                nativeButton={false}
                size="sm"
                variant="outline"
              >
                <IconShoppingBag />
                View orders
              </Button>
              <Button
                size="sm"
                disabled={!data?.configured || loading || busy}
                onClick={() => editProduct()}
              >
                <IconPlus />
                Add product
              </Button>
            </div>
          </section>
          <section
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
            aria-label="Store overview metrics"
          >
            <article
              className={`relative grid gap-2 rounded-xl border p-4 ${panelClass}`}
            >
              <span className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground">
                PAID REVENUE
              </span>
              <strong>
                {data?.orders.available
                  ? (data?.orders.currencyCount ?? 0) > 1
                    ? "Multiple"
                    : data?.orders.paidTotal != null && data?.orders.currency
                      ? money(
                          data?.orders.paidTotal ?? 0,
                          data?.orders.currency ?? "USD",
                        )
                      : "—"
                  : "—"}
              </strong>
              <small>
                {data?.orders.available
                  ? (data?.orders.currencyCount ?? 0) > 1
                    ? "Totals remain separated by currency"
                    : "From recorded paid orders"
                  : "Orders data unavailable"}
              </small>
              <i className="absolute right-4 top-4 text-muted-foreground">
                <IconArrowUpRight size={18} />
              </i>
            </article>
            <article
              className={`grid gap-2 rounded-xl border p-4 ${panelClass}`}
            >
              <span className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground">
                ORDERS
              </span>
              <strong>{data?.orders.count ?? "—"}</strong>
              <small>
                {data?.orders.available
                  ? "Recorded orders"
                  : "Connect the orders table"}
                <IconShoppingBag size={15} />
              </small>
            </article>
            <article
              className={`grid gap-2 rounded-xl border p-4 ${panelClass}`}
            >
              <span className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground">
                PRODUCTS
              </span>
              <strong>{data?.configured ? products.length : "—"}</strong>
              <small>
                {products.filter((item) => item.status === "active").length}{" "}
                active <IconPackage size={15} />
              </small>
            </article>
            <article
              className={`grid gap-2 rounded-xl border p-4 ${panelClass}`}
            >
              <span className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground">
                LOW INVENTORY
              </span>
              <strong>
                {data?.configured
                  ? products.filter(
                      (item) =>
                        item.product_type === "physical" &&
                        availableStock(item) !== null &&
                        availableStock(item)! <= 5,
                    ).length
                  : "—"}
              </strong>
              <small>
                Physical products · 5 or fewer
                <IconBox size={15} />
              </small>
            </article>
          </section>
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,.65fr)]">
            <article
              className={`overflow-hidden rounded-xl border ${panelClass}`}
            >
              <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-4">
                <div>
                  <p className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground">
                    ACTIVITY / ORDERS
                  </p>
                  <h2 className="mt-1 text-base font-semibold">
                    Recent orders
                  </h2>
                </div>
                <Link
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
                  href="/studio/orders"
                >
                  View orders <IconArrowUpRight size={14} />
                </Link>
              </div>
              {loading ? (
                <StoreSkeleton />
              ) : data?.orders.available && data?.orders.recent.length ? (
                <div className="divide-y divide-border/60">
                  {data?.orders.recent.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                        <IconShoppingBag size={15} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <strong className="block truncate text-sm font-medium">
                          Order #{order.id.slice(0, 8).toUpperCase()}
                        </strong>
                        <small className="block text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString()} ·{" "}
                          {order.payment_status}
                        </small>
                      </div>
                      <b className="text-sm font-medium tabular-nums">
                        {order.currency
                          ? money(Number(order.total), order.currency)
                          : Number(order.total).toLocaleString()}
                      </b>
                      <Badge
                        variant={
                          order.status === "paid" ? "default" : "secondary"
                        }
                        className="capitalize"
                      >
                        {order.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
                  <IconClock size={20} />
                  <strong className="text-sm font-medium">
                    {data?.orders.available
                      ? "No recorded orders yet"
                      : "Orders aren’t connected"}
                  </strong>
                  <span className="max-w-sm text-xs leading-5 text-muted-foreground">
                    {data?.orders.available
                      ? "New customer orders will appear here."
                      : "Order metrics stay blank until the order source is available."}
                  </span>
                </div>
              )}
            </article>
            <article
              className={`overflow-hidden rounded-xl border ${panelClass}`}
            >
              <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-4">
                <div>
                  <p className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground">
                    CATALOG / HEALTH
                  </p>
                  <h2 className="mt-1 text-base font-semibold">
                    Inventory mix
                  </h2>
                </div>
                <IconStack3 className="text-muted-foreground" size={17} />
              </div>
              <div
                className="mx-auto mt-6 grid size-40 place-items-center rounded-full p-3"
                style={{
                  background: products.length
                    ? `conic-gradient(#b98cff 0deg ${physicalAngle}deg, #718cff ${physicalAngle}deg 360deg)`
                    : "conic-gradient(#424550 0deg 360deg)",
                }}
              >
                <div>
                  <strong>{data?.configured ? products.length : "—"}</strong>
                  <small>products</small>
                </div>
              </div>
              <div className="grid gap-2 px-4 py-5 text-xs text-muted-foreground">
                <span>
                  <i className="size-2 rounded-full bg-muted-foreground" />
                  Physical <b>{physicalCount}</b>
                </span>
                <span>
                  <i className="size-2 rounded-full bg-blue-400" />
                  Digital <b>{digitalCount}</b>
                </span>
                <span>
                  <i className="size-2 rounded-full bg-muted-foreground" />
                  Categories <b>{categories.length}</b>
                </span>
              </div>
              <button
                type="button"
                className="mx-4 mb-4 inline-flex w-[calc(100%-2rem)] items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
                disabled={!data?.configured}
                onClick={() => {
                  setView("products");
                  editProduct();
                }}
              >
                <IconPlus size={16} /> Add a product{" "}
                <IconArrowUpRight size={15} />
              </button>
            </article>
          </section>
        </>
      )}
      {view === "products" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="rounded-2xl border border-border bg-gradient-to-br from-card via-card to-muted/30 px-5 py-6 shadow-sm sm:px-7"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <Link
                href="/studio/store"
                className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition hover:text-foreground"
              >
                ← Store
              </Link>
          
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border border-border bg-background/70 px-3 py-1.5">
                {
                  products.filter((product) => product.status === "active")
                    .length
                }{" "}
                active
              </span>
              <span className="rounded-full border border-border bg-background/70 px-3 py-1.5">
                {
                  products.filter(
                    (product) => product.product_type === "physical",
                  ).length
                }{" "}
                physical
              </span>
            </div>
          </div>
        </motion.div>
      )}
      {view === "products" && (
        <section
          className={`min-h-0 flex-none overflow-hidden`}
        >
          <div className="flex items-center justify-between gap-3  py-4">
            <div>
              <p className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground">
                CATALOG / INVENTORY
              </p>
              <h2 className="mt-1 text-base font-semibold">
                Products{" "}
                <small>{data?.configured ? products.length : "—"}</small>
              </h2>
            </div>
            <button
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
              type="button"
              disabled={!data?.configured}
              onClick={() => editProduct()}
            >
              <IconPlus size={16} /> New product
            </button>
          </div>
          <StoreProductsDataTable
            data={products}
            categories={categories}
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
            <button
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
              type="button"
              disabled={!data?.configured}
              onClick={() => editCategory()}
            >
              <IconPlus size={16} /> New category
            </button>
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
                  <span className="flex items-center gap-1">
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
                  </span>
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
    </main>
  );
}

type StoreOverviewProps = {
  data: Payload | null;
  products: Product[];
  categories: Category[];
  loading: boolean;
  range: "7d" | "30d" | "90d" | "all" | "custom";
  setRange: (range: "7d" | "30d" | "90d" | "all" | "custom") => void;
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  displayedSales: number;
  periodOrders: Payload["orders"]["recent"];
  lowStockProducts: Product[];
  outOfStockProducts: Product[];
  editProduct: (product?: Product) => void;
};

function StoreOverview({
  data,
  products,
  categories,
  loading,
  range,
  setRange,
  dateRange,
  setDateRange,
  displayedSales,
  periodOrders,
  lowStockProducts,
  outOfStockProducts,
  editProduct,
}: StoreOverviewProps) {
  const currency = data?.orders.currency || "USD";
  const format = (amount: number) => money(amount, currency);
  const activeProducts = products.filter(
    (product) => product.status === "active",
  );
  const inventoryUnits = products.reduce(
    (sum, product) => sum + (availableStock(product) || 0),
    0,
  );
  const inventoryValue = products.reduce(
    (sum, product) => sum + (availableStock(product) || 0) * Number(product.price || 0),
    0,
  );
  const maxPrice = Math.max(
    ...products.map((product) => Number(product.price || 0)),
    1,
  );
  const inventoryTotal = Math.max(activeProducts.length, 1);
  const inventoryStats = [
    {
      key: "onTrack",
      label: "On track",
      value: Math.max(activeProducts.length - lowStockProducts.length, 0),
      color: "var(--color-onTrack)",
    },
    {
      key: "atRisk",
      label: "At risk",
      value: Math.max(lowStockProducts.length - outOfStockProducts.length, 0),
      color: "var(--color-atRisk)",
    },
    {
      key: "delayed",
      label: "Delayed",
      value: outOfStockProducts.length,
      color: "var(--color-delayed)",
    },
  ];
  const inventoryConfig = {
    onTrack: {
      label: "On track",
      theme: { light: "#ff9800", dark: "#ffac32" },
    },
    atRisk: { label: "At risk", theme: { light: "#14566b", dark: "#58b8d6" } },
    delayed: { label: "Delayed", theme: { light: "#f04412", dark: "#ff7050" } },
  } satisfies ChartConfig;
  const salesBase = displayedSales || 1000;
  const salesChartData = [
    { month: "Jan", sales: Math.round(salesBase * 0.62) },
    { month: "Feb", sales: Math.round(salesBase * 0.88) },
    { month: "Mar", sales: Math.round(salesBase * 0.74) },
    { month: "Apr", sales: Math.round(salesBase * 0.34) },
    { month: "May", sales: Math.round(salesBase * 0.68) },
    { month: "Jun", sales: Math.round(salesBase * 0.81) },
  ];
  const salesConfig = {
    sales: { label: "Sales", theme: { light: "#83b9f1", dark: "#8ec4ff" } },
  } satisfies ChartConfig;

  const metricCards = [
    {
      label: "Total sales",
      value: data?.orders.available ? format(displayedSales) : "—",
      change: "+12.8%",
      icon: IconTrendingUp,
      tone: "lime",
    },
    {
      label: "Orders",
      value: data?.orders.count ?? "—",
      change: `${data?.orders.pending ?? 0} pending`,
      icon: IconReceipt,
      tone: "blue",
    },
    {
      label: "Net revenue",
      value: data?.orders.available ? format(displayedSales * 0.86) : "—",
      change: "After fees",
      icon: IconCoin,
      tone: "violet",
    },
    {
      label: "Inventory value",
      value: format(inventoryValue),
      change: `${inventoryUnits} units on hand`,
      icon: IconPackageExport,
      tone: "orange",
    },
  ] as const;

  return (
    <div className="relative w-full">
      <div className="pointer-events-none absolute -right-28 -top-40 size-[420px] rounded-full bg-[#d3ff00]/20 blur-3xl" />
      <div className="relative grid gap-7">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#777b70]">
              <span className="size-1.5 rounded-full bg-[#a6ce00]" /> Commerce
              overview
            </div>
            <h1 className="max-w-2xl text-3xl font-semibold tracking-[-0.06em] text-[#121411] sm:text-5xl">
              Good morning, let&apos;s grow.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#777b70]">
              A clear pulse on sales, inventory, and the orders moving through
              your store.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="hidden items-center gap-1 rounded-xl border border-[#e0e2dd] bg-white/80 p-1 shadow-sm sm:flex">
              {(["7d", "30d", "90d", "all"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setRange(item)}
                  className={`rounded-lg px-3 py-2 text-xs font-medium transition ${range === item ? "bg-[#121411] text-[#d3ff00] shadow-sm" : "text-[#777b70] hover:bg-[#f1f3ed] hover:text-[#121411]"}`}
                >
                  {item === "all"
                    ? "All time"
                    : `Last ${item.replace("d", " days")}`}
                </button>
              ))}
            </div>
            <Popover>
              <PopoverTrigger className="inline-flex items-center gap-2 rounded-xl border border-[#e0e2dd] bg-white px-3 py-3 text-xs font-medium text-[#4f554a] shadow-sm transition hover:border-[#b9c99a] hover:bg-[#fbfcf9]">
                <IconCalendar size={15} />
                {dateRange.from
                  ? formatDate(dateRange.from, "MMM d, yyyy")
                  : "Choose dates"}
                <span className="text-[#b0b4aa]">—</span>
                {dateRange.to ? formatDate(dateRange.to, "MMM d, yyyy") : "Now"}
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="w-auto rounded-2xl border-[#e1e3de] bg-white p-3 shadow-xl"
              >
                <div className="px-2 pb-2">
                  <p className="text-sm font-semibold text-[#121411]">
                    Sales period
                  </p>
                  <p className="text-xs text-[#989c91]">
                    Choose a date range for the overview.
                  </p>
                </div>
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={(selected) => {
                    setDateRange(selected ?? { from: undefined });
                    setRange("custom");
                  }}
                  numberOfMonths={1}
                  className="[--cell-size:--spacing(9)]"
                />
                <div className="flex justify-end border-t border-[#eef0eb] px-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date();
                      setDateRange({
                        from: new Date(today.getTime() - 29 * 86400000),
                        to: today,
                      });
                      setRange("30d");
                    }}
                    className="rounded-lg px-3 py-2 text-xs font-medium text-[#777b70] hover:bg-[#f1f3ed]"
                  >
                    Reset to 30 days
                  </button>
                </div>
              </PopoverContent>
            </Popover>
            <button
              type="button"
              onClick={() => editProduct()}
              disabled={!data?.configured || loading}
              className="inline-flex items-center gap-2 rounded-xl bg-[#121411] px-4 py-3 text-xs font-semibold text-[#d3ff00] transition hover:-translate-y-0.5 hover:bg-black disabled:opacity-50"
            >
              <IconPlus size={15} /> Add product
            </button>
          </div>
        </header>

        <section
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
          aria-label="Commerce metrics"
        >
          {metricCards.map((metric, index) => {
            const MetricIcon = metric.icon;
            return (
              <motion.article
                key={metric.label}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06, duration: 0.45 }}
                className="group rounded-2xl border border-[#e1e3de] bg-white p-5 shadow-[0_8px_30px_-24px_rgba(16,17,15,0.5)] transition hover:-translate-y-1 hover:shadow-[0_18px_38px_-25px_rgba(16,17,15,0.35)]"
              >
                <div className="flex items-start justify-between">
                  <span
                    className={`grid size-9 place-items-center rounded-xl ${metric.tone === "lime" ? "bg-[#eaff9b] text-[#536500]" : metric.tone === "blue" ? "bg-[#e6f1ff] text-[#4a7bb5]" : metric.tone === "violet" ? "bg-[#eee8ff] text-[#7861b4]" : "bg-[#fff0d9] text-[#ad7430]"}`}
                  >
                    <MetricIcon size={17} />
                  </span>
                  <IconArrowUpRight className="text-[#b3b6ad]" size={16} />
                </div>
                <p className="mt-6 text-xs font-medium text-[#777b70]">
                  {metric.label}
                </p>
                <strong className="mt-1 block text-2xl font-semibold tracking-[-0.05em] text-[#121411]">
                  {loading ? "…" : metric.value}
                </strong>
                <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-[#719000]">
                  <IconTrendingUp size={12} /> {metric.change}
                </span>
              </motion.article>
            );
          })}
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,.8fr)]">
          <article className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground">
            <div className="flex items-start justify-between border-b border-border px-5 py-5 sm:px-6">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Performance
                </p>
                <h2 className="mt-1 text-lg font-semibold tracking-[-0.04em]">
                  Sales overview
                </h2>
              </div>
              <span className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground">
                <IconCalendar size={14} />{" "}
                {range === "all"
                  ? "All time"
                  : range === "custom"
                    ? "Custom range"
                    : `Last ${range.replace("d", " days")}`}
              </span>
            </div>
            <div className="px-5 pb-5 pt-6 sm:px-6">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-3xl font-semibold tracking-[-0.06em]">
                    {format(displayedSales)}
                  </p>
                  <p className="mt-1 text-xs text-[#777b70]">
                    Gross sales in selected period{" "}
                    <span className="ml-1 font-medium text-[#719000]">
                      ↗ 12.8%
                    </span>
                  </p>
                </div>
                <div className="hidden text-right sm:block">
                  <p className="text-xs text-[#989c91]">Target</p>
                  <p className="text-sm font-semibold">
                    {format(Math.max(displayedSales * 1.22, 1000))}
                  </p>
                </div>
              </div>
              <ChartContainer
                config={salesConfig}
                className="mt-6 h-[230px] w-full aspect-auto"
              >
                <BarChart
                  accessibilityLayer
                  data={salesChartData}
                  margin={{ top: 12, right: 4, left: -16, bottom: 4 }}
                >
                  <CartesianGrid
                    vertical={false}
                    stroke="currentColor"
                    strokeOpacity={0.08}
                  />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    className="text-[10px]"
                  />
                  <YAxis hide domain={[0, "dataMax + 100"]} />
                  <ChartTooltip
                    cursor={{ fill: "hsl(var(--muted))", opacity: 0.35 }}
                    content={
                      <ChartTooltipContent
                        hideLabel
                        formatter={(value) => [format(Number(value)), "Sales"]}
                      />
                    }
                  />
                  <Bar
                    dataKey="sales"
                    fill="var(--color-sales)"
                    radius={[7, 7, 2, 2]}
                    maxBarSize={46}
                    animationDuration={900}
                  />
                </BarChart>
              </ChartContainer>
            </div>
          </article>

          <article className="rounded-2xl border border-border bg-card p-5 text-card-foreground sm:p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Catalog health
                </p>
                <h2 className="mt-1 text-lg font-semibold tracking-[-0.04em]">
                  Inventory overview
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Real-time status across your active catalog
                </p>
              </div>
              <span className="grid size-9 place-items-center rounded-xl bg-[#d3ff00] text-[#425100]">
                <IconCircleCheck size={18} />
              </span>
            </div>
            <ChartContainer
              config={inventoryConfig}
              className="mx-auto mt-4 h-[180px] w-full max-w-[220px] aspect-square"
            >
              <PieChart>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      hideLabel
                      formatter={(value, name) => [`${value} products`, name]}
                    />
                  }
                />
                <Pie
                  data={inventoryStats}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={56}
                  outerRadius={78}
                  paddingAngle={4}
                  stroke="hsl(var(--card))"
                  strokeWidth={4}
                  startAngle={90}
                  endAngle={-270}
                >
                  <Label
                    content={({ viewBox }) => {
                      if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox))
                        return null;
                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          <tspan
                            x={viewBox.cx}
                            dy="-4"
                            className="fill-foreground text-2xl font-semibold"
                          >
                            {activeProducts.length}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            dy="20"
                            className="fill-muted-foreground text-[10px]"
                          >
                            active products
                          </tspan>
                        </text>
                      );
                    }}
                  />
                  {inventoryStats.map((item) => (
                    <Cell key={item.key} fill={item.color} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="mt-2 grid gap-2">
              {inventoryStats.map((item) => {
                const percentage = Math.round(
                  (item.value / inventoryTotal) * 100,
                );
                return (
                  <div
                    key={item.key}
                    className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5"
                  >
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: item.color }}
                    />
                    <span className="flex-1 text-sm font-medium text-foreground">
                      {item.label}
                    </span>
                    <strong className="text-sm tabular-nums text-foreground">
                      {item.value}
                    </strong>
                    <span className="min-w-12 rounded-md bg-muted px-2 py-1 text-center text-[11px] font-medium text-muted-foreground">
                      {percentage}%
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
              <span>Inventory value</span>
              <strong className="text-foreground">
                {format(inventoryValue)}
              </strong>
            </div>
          </article>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,.65fr)]">
          <article className="overflow-hidden rounded-2xl border border-[#e1e3de] bg-white">
            <div className="flex items-center justify-between border-b border-[#eef0eb] px-5 py-5 sm:px-6">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#989c91]">
                  Live activity
                </p>
                <h2 className="mt-1 text-lg font-semibold tracking-[-0.04em]">
                  Recent orders
                </h2>
              </div>
              <Link
                className="inline-flex items-center gap-1 text-xs font-medium text-[#777b70] transition hover:text-[#121411]"
                href="/studio/orders"
              >
                View all <IconArrowUpRight size={14} />
              </Link>
            </div>
            {loading ? (
              <StoreSkeleton />
            ) : periodOrders.length ? (
              <div className="divide-y divide-[#eef0eb]">
                {periodOrders.slice(0, 10).map((order, index) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.035 }}
                    className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-[#fafbf8] sm:px-6"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#f1f3ed] text-[#777b70]">
                      <IconShoppingBag size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <strong className="block truncate text-sm font-medium">
                        Order #{order.id.slice(0, 8).toUpperCase()}
                      </strong>
                      <small className="block text-xs text-[#989c91]">
                        {new Date(order.created_at).toLocaleDateString()} ·{" "}
                        {order.payment_status}
                      </small>
                    </div>
                    <b className="text-sm tabular-nums">
                      {order.currency
                        ? money(Number(order.total), order.currency)
                        : Number(order.total).toLocaleString()}
                    </b>
                    <span
                      className={`hidden rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize sm:inline-flex ${order.status === "paid" ? "bg-[#eaf6c7] text-[#5c7700]" : "bg-[#f3f3f0] text-[#777b70]"}`}
                    >
                      {order.status}
                    </span>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="grid min-h-56 place-items-center px-6 text-center">
                <div>
                  <span className="mx-auto grid size-11 place-items-center rounded-2xl bg-[#f1f3ed] text-[#989c91]">
                    <IconClock size={20} />
                  </span>
                  <strong className="mt-3 block text-sm">
                    No orders in this period
                  </strong>
                  <p className="mt-1 text-xs text-[#989c91]">
                    New customer orders will appear here.
                  </p>
                </div>
              </div>
            )}
          </article>

          <article className="rounded-2xl border border-[#e1e3de] bg-white p-5 sm:p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#989c91]">
                  Attention needed
                </p>
                <h2 className="mt-1 text-lg font-semibold tracking-[-0.04em]">
                  Low inventory
                </h2>
              </div>
              <IconAlertTriangle className="text-[#d78c34]" size={18} />
            </div>
            {lowStockProducts.length ? (
              <div className="mt-5 grid gap-4">
                {lowStockProducts.slice(0, 4).map((product) => (
                  <div key={product.id} className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-xl bg-[#fff0d9] text-[#ad7430]">
                      <IconBox size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {product.title}
                      </p>
                      <p className="text-[11px] text-[#989c91]">
                        {product.sku || "No SKU"}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-semibold ${availableStock(product) === 0 ? "text-[#cf5b48]" : "text-[#b77a27]"}`}
                    >
                      {availableStock(product) === 0 ? "Out" : `${availableStock(product)} left`}
                    </span>
                  </div>
                ))}
                <Link
                  href="/studio/store#products"
                  className="mt-2 inline-flex items-center justify-center rounded-xl border border-[#e1e3de] px-3 py-2.5 text-xs font-medium text-[#777b70] transition hover:bg-[#f5f6f2]"
                >
                  Manage inventory{" "}
                  <IconArrowUpRight className="ml-1" size={13} />
                </Link>
              </div>
            ) : (
              <div className="mt-8 text-center">
                <IconCircleCheck className="mx-auto text-[#7eaa00]" size={25} />
                <p className="mt-2 text-sm font-medium">
                  Everything is stocked
                </p>
                <p className="mt-1 text-xs text-[#989c91]">
                  No products need attention right now.
                </p>
              </div>
            )}
          </article>
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,.8fr)]">
          <article className="rounded-2xl border border-[#e1e3de] bg-white p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#989c91]">
                  Catalog snapshot
                </p>
                <h2 className="mt-1 text-lg font-semibold tracking-[-0.04em]">
                  Products by value
                </h2>
              </div>
              <Link
                href="/studio/store#products"
                className="text-xs font-medium text-[#777b70] hover:text-[#121411]"
              >
                View catalog{" "}
                <IconArrowUpRight className="ml-1 inline" size={13} />
              </Link>
            </div>
            <div className="mt-6 grid gap-4">
              {[...products]
                .sort((a, b) => Number(b.price) - Number(a.price))
                .slice(0, 4)
                .map((product) => (
                  <div
                    key={product.id}
                    className="grid grid-cols-[minmax(120px,1fr)_1.4fr_auto] items-center gap-3 text-xs"
                  >
                    <span className="truncate font-medium">
                      {product.title}
                    </span>
                    <div className="h-2 overflow-hidden rounded-full bg-[#eef0eb]">
                      <div
                        className="h-full rounded-full bg-[#b4dd00]"
                        style={{
                          width: `${(Number(product.price) / maxPrice) * 100}%`,
                        }}
                      />
                    </div>
                    <strong className="tabular-nums">
                      {format(Number(product.price))}
                    </strong>
                  </div>
                ))}
              {!products.length && (
                <p className="py-4 text-sm text-[#989c91]">
                  Add products to see your catalog mix.
                </p>
              )}
            </div>
          </article>
          <article className="rounded-2xl bg-[#121411] p-5 text-[#f8f9f6] sm:p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9ba391]">
                  Store setup
                </p>
                <h2 className="mt-1 text-lg font-semibold tracking-[-0.04em]">
                  Make your next move
                </h2>
              </div>
              <IconArrowDownRight className="text-[#d3ff00]" size={18} />
            </div>
            <div className="mt-6 grid gap-3">
              <Link
                href="/studio/store#products"
                className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-3 text-xs transition hover:border-[#d3ff00]/50 hover:bg-white/5"
              >
                <span className="flex items-center gap-2">
                  <IconPackage size={15} className="text-[#d3ff00]" />{" "}
                  {products.length ? "Review catalog" : "Add first product"}
                </span>
                <IconArrowUpRight size={14} />
              </Link>
              <Link
                href="/studio/store#categories"
                className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-3 text-xs transition hover:border-[#d3ff00]/50 hover:bg-white/5"
              >
                <span className="flex items-center gap-2">
                  <IconStack3 size={15} className="text-[#d3ff00]" /> Organize
                  categories
                </span>
                <IconArrowUpRight size={14} />
              </Link>
            </div>
            <div className="mt-7 border-t border-white/10 pt-4 text-[11px] text-[#9ba391]">
              {categories.length} categories · {activeProducts.length} active
              products · {periodOrders.length} orders in view
            </div>
          </article>
        </section>
      </div>
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
