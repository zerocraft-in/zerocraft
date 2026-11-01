"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  IconPhoto,
  IconRefresh,
  IconRestore,
  IconShoppingBag,
  IconTag,
} from "@tabler/icons-react";
import { Badge } from "@zerocraft/components/ui/badge";
import { Button } from "@zerocraft/components/ui/button";
import { PageState } from "@/components/commerce/page-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@zerocraft/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@zerocraft/components/ui/tabs";

type DeletedRecord = {
  id: string;
  deleted_at: string;
  purge_after: string;
};
type DeletedProduct = DeletedRecord & {
  title: string;
  sku: string;
  product_type: string;
};
type DeletedCategory = DeletedRecord & {
  name: string;
  slug: string;
};
type DeletedSubcategory = DeletedCategory & { category_id: string };
type DeletedAsset = DeletedRecord & {
  storage_path: string;
  file_name: string;
  folder: string;
  mime_type: string;
  size_bytes: number;
  url: string;
};
type RecycleBinData = {
  products: DeletedProduct[];
  categories: DeletedCategory[];
  subcategories: DeletedSubcategory[];
  assets: DeletedAsset[];
};
type BinTab = "products" | "categories" | "gallery";

const emptyBin: RecycleBinData = {
  products: [],
  categories: [],
  subcategories: [],
  assets: [],
};

function daysRemaining(purgeAfter: string) {
  return Math.max(
    0,
    Math.ceil((new Date(purgeAfter).getTime() - Date.now()) / 86400000),
  );
}

function formatDeletedAt(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatAssetSize(bytes: number) {
  if (!bytes) return "Unknown size";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function StoreRecycleBin() {
  const [data, setData] = useState<RecycleBinData>(emptyBin);
  const [tab, setTab] = useState<BinTab>("products");
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/store/recycle-bin", {
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Recycle bin could not be loaded.");
      }
      setData({
        products: payload.products || [],
        categories: payload.categories || [],
        subcategories: payload.subcategories || [],
        assets: payload.assets || [],
      });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Recycle bin could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let current = true;
    fetch("/api/store/recycle-bin", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || "Recycle bin could not be loaded.");
        }
        return payload;
      })
      .then((payload) => {
        if (current) {
          setData({
            products: payload.products || [],
            categories: payload.categories || [],
            subcategories: payload.subcategories || [],
            assets: payload.assets || [],
          });
        }
      })
      .catch((cause: unknown) => {
        if (current) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Recycle bin could not be loaded.",
          );
        }
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, []);

  const visibleSubcategories = useMemo(
    () =>
      data.subcategories.filter((subcategory) => {
        const parent = data.categories.find(
          (category) => category.id === subcategory.category_id,
        );
        return !parent || parent.deleted_at !== subcategory.deleted_at;
      }),
    [data.categories, data.subcategories],
  );

  async function restore(
    type: "product" | "category" | "subcategory" | "asset",
    id: string,
    storagePath?: string,
  ) {
    const key = `${type}:${storagePath || id}`;
    if (busyKey) return;
    setBusyKey(key);
    setError("");
    try {
      const response =
        type === "product"
          ? await fetch("/api/store", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ entity: "product", id, action: "restore" }),
            })
          : await fetch("/api/store/recycle-bin", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(
                type === "asset"
                  ? { type, storagePath }
                  : { type, id },
              ),
            });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "The item could not be restored.");
      }
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The item could not be restored.",
      );
    } finally {
      setBusyKey("");
    }
  }

  const totals = {
    products: data.products.length,
    categories: data.categories.length + visibleSubcategories.length,
    gallery: data.assets.length,
  };

  return (
    <main className="mx-auto w-full max-w-screen-2xl space-y-6 pb-12">
      <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Store / Catalog
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Recycle bin
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Restore deleted products, category trees, and unused gallery assets
            within 15 days. Expired items are permanently purged; products are
            unassigned when their deleted category expires.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void load()}
          disabled={loading || Boolean(busyKey)}
        >
          <IconRefresh className={loading ? "animate-spin" : ""} /> Refresh
        </Button>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      <Tabs value={tab} onValueChange={(value) => setTab(value as BinTab)}>
        <TabsList>
          <TabsTrigger value="products">
            <IconShoppingBag className="size-4" /> Products
            <Badge variant="secondary">{totals.products}</Badge>
          </TabsTrigger>
          <TabsTrigger value="categories">
            <IconTag className="size-4" /> Categories
            <Badge variant="secondary">{totals.categories}</Badge>
          </TabsTrigger>
          <TabsTrigger value="gallery">
            <IconPhoto className="size-4" /> Gallery
            <Badge variant="secondary">{totals.gallery}</Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        {loading ? (
          <PageState
            kind="loading"
            title="Loading recycle bin"
            description="Fetching deleted store history."
          />
        ) : tab === "products" ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Deleted</TableHead>
                <TableHead>Retention</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.products.length ? (
                data.products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <p className="font-medium">{product.title}</p>
                      <p className="text-xs text-muted-foreground">
                        SKU {product.sku || "—"}
                      </p>
                    </TableCell>
                    <TableCell className="capitalize">
                      {product.product_type}
                    </TableCell>
                    <TableCell>{formatDeletedAt(product.deleted_at)}</TableCell>
                    <TableCell>
                      <RetentionBadge purgeAfter={product.purge_after} />
                    </TableCell>
                    <TableCell className="text-right">
                      <RestoreButton
                        disabled={daysRemaining(product.purge_after) === 0}
                        busy={busyKey === `product:${product.id}`}
                        onClick={() => void restore("product", product.id)}
                      />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <EmptyRow message="No deleted products." />
              )}
            </TableBody>
          </Table>
        ) : tab === "categories" ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Deleted</TableHead>
                <TableHead>Retention</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...data.categories, ...visibleSubcategories].length ? (
                <>
                  {data.categories.map((category) => (
                    <TableRow key={`category:${category.id}`}>
                      <TableCell>
                        <p className="font-medium">{category.name}</p>
                        <p className="text-xs text-muted-foreground">
                          /{category.slug} · category tree
                        </p>
                      </TableCell>
                      <TableCell>{formatDeletedAt(category.deleted_at)}</TableCell>
                      <TableCell>
                        <RetentionBadge purgeAfter={category.purge_after} />
                      </TableCell>
                      <TableCell className="text-right">
                        <RestoreButton
                          disabled={daysRemaining(category.purge_after) === 0}
                          busy={busyKey === `category:${category.id}`}
                          onClick={() =>
                            void restore("category", category.id)
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {visibleSubcategories.map((subcategory) => (
                    <TableRow key={`subcategory:${subcategory.id}`}>
                      <TableCell>
                        <p className="font-medium">{subcategory.name}</p>
                        <p className="text-xs text-muted-foreground">
                          /{subcategory.slug} · subcategory
                        </p>
                      </TableCell>
                      <TableCell>
                        {formatDeletedAt(subcategory.deleted_at)}
                      </TableCell>
                      <TableCell>
                        <RetentionBadge purgeAfter={subcategory.purge_after} />
                      </TableCell>
                      <TableCell className="text-right">
                        <RestoreButton
                          disabled={daysRemaining(subcategory.purge_after) === 0}
                          busy={busyKey === `subcategory:${subcategory.id}`}
                          onClick={() =>
                            void restore("subcategory", subcategory.id)
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              ) : (
                <EmptyRow message="No deleted categories." colSpan={4} />
              )}
            </TableBody>
          </Table>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Folder</TableHead>
                <TableHead>Deleted</TableHead>
                <TableHead>Retention</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.assets.length ? (
                data.assets.map((asset) => (
                  <TableRow key={asset.storage_path}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="size-12 overflow-hidden rounded-md border bg-muted">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={asset.url}
                            alt=""
                            className="size-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="max-w-72 truncate font-medium">
                            {asset.file_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatAssetSize(Number(asset.size_bytes))}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{asset.folder}</TableCell>
                    <TableCell>{formatDeletedAt(asset.deleted_at)}</TableCell>
                    <TableCell>
                      <RetentionBadge purgeAfter={asset.purge_after} />
                    </TableCell>
                    <TableCell className="text-right">
                      <RestoreButton
                        disabled={daysRemaining(asset.purge_after) === 0}
                        busy={busyKey === `asset:${asset.storage_path}`}
                        onClick={() =>
                          void restore("asset", asset.storage_path, asset.storage_path)
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <EmptyRow message="No deleted gallery assets." />
              )}
            </TableBody>
          </Table>
        )}
      </section>
    </main>
  );
}

function RetentionBadge({ purgeAfter }: { purgeAfter: string }) {
  const days = daysRemaining(purgeAfter);
  return (
    <Badge variant={days <= 2 ? "destructive" : "outline"}>
      {days === 0 ? "Expiring" : `${days} day${days === 1 ? "" : "s"} left`}
    </Badge>
  );
}

function RestoreButton({
  disabled,
  busy,
  onClick,
}: {
  disabled: boolean;
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={disabled || busy}
      onClick={onClick}
    >
      <IconRestore className={busy ? "animate-pulse" : ""} />
      {busy ? "Restoring…" : "Restore"}
    </Button>
  );
}

function EmptyRow({
  message,
  colSpan = 5,
}: {
  message: string;
  colSpan?: number;
}) {
  return (
    <TableRow>
      <TableCell
        colSpan={colSpan}
        className="py-12 text-center text-sm text-muted-foreground"
      >
        {message}
      </TableCell>
    </TableRow>
  );
}


